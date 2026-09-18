import { createClient } from "@/lib/supabase/client";
import { EMPRESAS } from "@/lib/empresas";
import { FORMAS_PAGO, type CartItem, type DocType } from "./types";
import type { ComprobanteDocData } from "./print";

export interface VentaRow {
  id: string;
  numero: string;
  tipo: string;
  doc_type: DocType;
  empresa_cuit: string;
  cliente_id: string | null;
  cliente_nombre: string;
  dni: string | null;
  condicion_pago: string;
  subtotal: number;
  descuento: number;
  total: number;
  discrimina_iva: boolean;
  cae: string | null;
  cae_vencimiento: string | null;
  creado_en: string;
}

// Elimina un comprobante y deshace sus efectos: devuelve el stock que había
// descontado (si no era NC), borra el comprobante de cta. cte. asociado (si
// era a cuenta corriente) y el cheque asociado (si era cheque/eCheq).
export async function eliminarVenta(venta: VentaRow) {
  const supabase = createClient();

  const { data: items } = await supabase
    .from("venta_items")
    .select("codigo, cantidad")
    .eq("venta_id", venta.id);

  if (!venta.doc_type.startsWith("nc_") && items && items.length > 0) {
    const codigos = items.map((it) => it.codigo).filter((c): c is string => !!c);
    if (codigos.length > 0) {
      const { data: arts } = await supabase.from("articulos").select("id, codigo").in("codigo", codigos);
      for (const it of items) {
        if (!it.codigo) continue;
        const art = arts?.find((a) => a.codigo === it.codigo);
        if (art) await supabase.rpc("devolver_stock", { p_articulo_id: art.id, p_cantidad: Number(it.cantidad) });
      }
    }
  }

  if (venta.condicion_pago === "cta_cte" && venta.cliente_id) {
    await supabase
      .from("cta_cte_comprobantes")
      .delete()
      .eq("numero", venta.numero)
      .eq("cliente_id", venta.cliente_id);
  }

  if (venta.condicion_pago === "cheque" || venta.condicion_pago === "echeq") {
    await supabase.from("cheques").delete().eq("origen", "Venta").eq("origen_numero", venta.numero);
  }

  await supabase.from("ventas").delete().eq("id", venta.id);
}

export async function buildComprobanteDoc(venta: VentaRow): Promise<ComprobanteDocData> {
  const supabase = createClient();
  const { data: itemsData } = await supabase
    .from("venta_items")
    .select("codigo, descripcion, marca, cantidad, precio, iva")
    .eq("venta_id", venta.id);

  const items: CartItem[] = (itemsData ?? []).map((it) => ({
    codigo: it.codigo,
    descripcion: it.descripcion,
    marca: it.marca ?? "",
    cantidad: Number(it.cantidad),
    precio: Number(it.precio),
    iva: Number(it.iva),
  }));

  const empresa = EMPRESAS.find((e) => e.cuit === venta.empresa_cuit) ?? EMPRESAS[0];
  const formaPago = FORMAS_PAGO.find((f) => f.id === venta.condicion_pago)?.label ?? venta.condicion_pago;

  return {
    docType: venta.doc_type,
    numero: venta.numero,
    empresa,
    clienteNombre: venta.cliente_nombre,
    dni: venta.dni ?? undefined,
    condicionPagoLabel: venta.condicion_pago === "nc" ? "Nota de crédito" : formaPago,
    items,
    subtotal: Number(venta.subtotal),
    descuento: Number(venta.descuento),
    total: Number(venta.total),
    cae: venta.cae ?? undefined,
    caeVencimiento: venta.cae_vencimiento
      ? new Date(venta.cae_vencimiento).toLocaleDateString("es-AR")
      : undefined,
    fecha: new Date(venta.creado_en).toLocaleDateString("es-AR"),
  };
}
