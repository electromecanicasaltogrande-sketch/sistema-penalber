import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPRESAS } from "@/lib/empresas";
import { CONDICIONES_IVA, TIPOS_DOC, soloDigitos, validarDocumento, type TipoDoc } from "@/lib/clientes/documento";
import { credencialesDe, emisionHabilitada } from "./config";
import { obtenerAuth } from "./ticket";
import { solicitarCae, ultimoAutorizado, type IvaAlicuota } from "./wsfe";

export type DocArca = "factura_a" | "factura_b" | "nc_a" | "nc_b";

const CBTE_TIPO: Record<DocArca, number> = { factura_a: 1, factura_b: 6, nc_a: 3, nc_b: 8 };
const PREFIJO: Record<DocArca, string> = { factura_a: "FC A", factura_b: "FC B", nc_a: "NC A", nc_b: "NC B" };
const ALICUOTA_ID: Record<string, number> = { "0": 3, "10.5": 4, "21": 5, "27": 6, "5": 8, "2.5": 9 };

export interface EmitirInput {
  empresaCuit: string;
  docType: DocArca;
  receptor: { tipoDoc: TipoDoc; numero: string; condicionIva?: string };
  items: { cantidad: number; precio: number; iva: number }[];
  descuento: number;
  ncReferencia?: string;
}

export interface EmitirOk {
  ok: true;
  numero: string;
  cbteNro: number;
  cae: string;
  caeVencimiento: string; // YYYY-MM-DD
  total: number;
  neto: number;
  iva: number;
  fecha: string; // YYYY-MM-DD
}

export interface EmitirError {
  ok: false;
  error: string;
  detalles?: string[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function fechaHoyAr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

export function calcularImportes(items: EmitirInput["items"], descuento: number) {
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const factor = subtotal > 0 ? Math.max(0, subtotal - descuento) / subtotal : 0;
  const grupos = new Map<number, number>();
  for (const i of items) grupos.set(i.iva, (grupos.get(i.iva) ?? 0) + i.precio * i.cantidad * factor);
  const alicuotas: IvaAlicuota[] = [];
  let neto = 0;
  let iva = 0;
  for (const [tasa, totalBruto] of grupos) {
    const id = ALICUOTA_ID[String(tasa)];
    if (!id) throw new Error(`Alícuota de IVA no admitida: ${tasa}%.`);
    const totalG = r2(totalBruto);
    const base = r2(totalG / (1 + tasa / 100));
    const imp = tasa === 0 ? 0 : r2(base * (tasa / 100));
    alicuotas.push({ id, base, importe: imp });
    neto += base;
    iva += imp;
  }
  neto = r2(neto);
  iva = r2(iva);
  return { neto, iva, total: r2(neto + iva), alicuotas };
}

export async function emitirComprobante(supabase: SupabaseClient, input: EmitirInput): Promise<EmitirOk | EmitirError> {
  try {
    if (!emisionHabilitada()) {
      return { ok: false, error: "La emisión con ARCA todavía no está habilitada en el sistema." };
    }
    const empresa = EMPRESAS.find((e) => e.cuit === input.empresaCuit);
    if (!empresa) return { ok: false, error: "Empresa desconocida." };
    if (!credencialesDe(empresa.cuit)) {
      return { ok: false, error: `Falta cargar el certificado de ARCA de ${empresa.razonSocial}.` };
    }
    if (!input.items.length) return { ok: false, error: "No hay renglones para facturar." };

    const esA = input.docType === "factura_a" || input.docType === "nc_a";
    const tipoDoc = TIPOS_DOC.find((t) => t.id === input.receptor.tipoDoc);
    if (!tipoDoc) return { ok: false, error: "Tipo de documento del cliente inválido." };
    const errDoc = validarDocumento(tipoDoc.id, input.receptor.numero);
    if (errDoc) return { ok: false, error: errDoc };
    if (esA && (tipoDoc.id === "SIN" || tipoDoc.id === "DNI")) {
      return { ok: false, error: "Las facturas A requieren CUIT o CUIL del cliente." };
    }
    const condicion = CONDICIONES_IVA.find((c) => c.id === input.receptor.condicionIva);
    const condCodigo = condicion?.codigoArca ?? (esA ? 1 : 5);
    if (esA && !condicion?.facturaA && input.receptor.condicionIva) {
      return { ok: false, error: "Ese cliente no corresponde a Factura A (según su condición frente al IVA)." };
    }

    const { neto, iva, total, alicuotas } = calcularImportes(input.items, input.descuento);
    if (total <= 0) return { ok: false, error: "El total del comprobante es cero." };

    let asociado: { tipo: number; ptoVta: number; nro: number } | undefined;
    if (input.docType === "nc_a" || input.docType === "nc_b") {
      const m = (input.ncReferencia ?? "").match(/^FC ([AB]) (\d{4})-(\d{8})$/);
      if (!m) return { ok: false, error: "La nota de crédito necesita la factura que anula (elegila de la lista)." };
      asociado = { tipo: m[1] === "A" ? 1 : 6, ptoVta: Number(m[2]), nro: Number(m[3]) };
    }

    const auth = await obtenerAuth(supabase, empresa.cuit);
    const ptoVta = Number(empresa.puntoVenta);
    const cbteTipo = CBTE_TIPO[input.docType];
    const fecha = fechaHoyAr();

    let resultado = null as Awaited<ReturnType<typeof solicitarCae>> | null;
    let nro = 0;
    for (let intento = 0; intento < 2; intento++) {
      nro = (await ultimoAutorizado(auth, ptoVta, cbteTipo)) + 1;
      resultado = await solicitarCae(auth, {
        ptoVta,
        cbteTipo,
        concepto: 1,
        docTipo: tipoDoc.codigoArca,
        docNro: tipoDoc.id === "SIN" ? "0" : soloDigitos(input.receptor.numero),
        cbteNro: nro,
        fecha: fecha.replace(/-/g, ""),
        total,
        neto,
        iva,
        alicuotas,
        condicionIvaReceptor: condCodigo,
        asociado,
      });
      const choque = resultado.errores.some((e) => e.codigo === "10016");
      if (!choque) break;
    }
    if (!resultado || resultado.resultado !== "A" || !resultado.cae) {
      const detalles = [...(resultado?.errores ?? []), ...(resultado?.observaciones ?? [])].map((e) => `(${e.codigo}) ${e.mensaje}`);
      return { ok: false, error: "ARCA no autorizó el comprobante.", detalles };
    }
    const v = resultado.caeVto;
    return {
      ok: true,
      numero: `${PREFIJO[input.docType]} ${empresa.puntoVenta}-${String(resultado.cbteNro || nro).padStart(8, "0")}`,
      cbteNro: resultado.cbteNro || nro,
      cae: resultado.cae,
      caeVencimiento: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`,
      total,
      neto,
      iva,
      fecha,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido al conectar con ARCA." };
  }
}
