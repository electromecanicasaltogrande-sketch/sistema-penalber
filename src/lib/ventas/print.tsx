"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/format";
import type { Empresa } from "@/lib/empresas";
import { descargarComoPDF } from "@/lib/print-pdf";
import { DOC_LABELS, type CartItem, type DocType } from "./types";

export interface ComprobanteDocData {
  docType: DocType;
  numero: string;
  empresa: Empresa;
  clienteNombre: string;
  dni?: string;
  clienteTipoDoc?: string;
  clienteDomicilio?: string;
  clienteLocalidad?: string;
  clienteCondicionIva?: string;
  condicionPagoLabel: string;
  items: CartItem[];
  subtotal: number;
  descuento: number;
  total: number;
  cae?: string;
  caeVencimiento?: string;
  fecha: string;
  hora?: string;
  clienteCodigo?: string;
}

const UNI = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve"];
const DEC = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CEN = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menosDeMil(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CEN[c]);
  if (r < 30) {
    if (r) partes.push(UNI[r]);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    partes.push(u ? `${DEC[d]} y ${UNI[u]}` : DEC[d]);
  }
  return partes.join(" ");
}

function enLetras(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millon" : `${enLetras(millones)} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${menosDeMil(miles).replace(/uno$/, "un")} mil`);
  if (resto) partes.push(menosDeMil(resto));
  return partes.join(" ");
}

function amountToWords(n: number): string {
  const cent = Math.round(n * 100);
  return `${enLetras(Math.floor(cent / 100))} con ${cent % 100}/100.-`;
}

const money2 = (n: number) => n.toFixed(2).replace(".", ",");

// Código de barras AFIP (Interleaved 2 of 5): CUIT + tipo + PV + CAE + vencimiento + dígito verificador.
function codigoBarrasAfip(doc: ComprobanteDocData, codTipo: string): string | null {
  if (!doc.cae || !doc.caeVencimiento) return null;
  const [d, m, y] = doc.caeVencimiento.split("/");
  if (!y) return null;
  const pv = (doc.numero.match(/(\d{4})-\d+$/)?.[1] ?? doc.empresa.puntoVenta).padStart(5, "0");
  const base = `${doc.empresa.cuit}${codTipo.padStart(3, "0")}${pv}${doc.cae}${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
  if (!/^\d+$/.test(base)) return null;
  let impar = 0;
  let par = 0;
  base.split("").forEach((ch, i) => (i % 2 === 0 ? (impar += +ch) : (par += +ch)));
  const dv = (10 - ((impar * 3 + par) % 10)) % 10;
  return base + dv;
}

const PATRON: Record<string, string> = {
  "0": "nnwwn", "1": "wnnnw", "2": "nwnnw", "3": "wwnnn", "4": "nnwnw",
  "5": "wnwnn", "6": "nwwnn", "7": "nnnww", "8": "wnnwn", "9": "nwnwn",
};

function BarrasI25({ codigo }: { codigo: string }) {
  const datos = codigo.length % 2 ? "0" + codigo : codigo;
  const barras: { x: number; w: number }[] = [];
  let x = 0;
  const avanzar = (w: number, bar: boolean) => {
    if (bar) barras.push({ x, w });
    x += w;
  };
  [1, 1, 1, 1].forEach((w, i) => avanzar(w, i % 2 === 0));
  for (let i = 0; i < datos.length; i += 2) {
    const a = PATRON[datos[i]];
    const b = PATRON[datos[i + 1]];
    for (let k = 0; k < 5; k++) {
      avanzar(a[k] === "w" ? 3 : 1, true);
      avanzar(b[k] === "w" ? 3 : 1, false);
    }
  }
  avanzar(3, true);
  avanzar(1, false);
  avanzar(1, true);
  return (
    <div>
      <svg viewBox={`0 0 ${x} 30`} preserveAspectRatio="none" className="h-9 w-72">
        {barras.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="#000" />
        ))}
      </svg>
      <p className="font-mono text-[8px] tracking-wider">{codigo}</p>
    </div>
  );
}

const COD_TIPO: Record<string, string> = { factura_a: "1", factura_b: "6", factura_c: "11", nc_a: "3", nc_b: "8", remito_r: "91" };

function Copia({ doc, etiqueta }: { doc: ComprobanteDocData; etiqueta: string }) {
  const info = DOC_LABELS[doc.docType];
  const isRemito = !info.hasCae;
  const esA = doc.docType === "factura_a" || doc.docType === "nc_a";
  const codTipo = COD_TIPO[doc.docType] ?? "6";

  const ratio = doc.subtotal > 0 ? doc.total / doc.subtotal : 1;
  const porAlicuota = new Map<number, number>();
  let neto = 0;
  for (const it of doc.items) {
    const bruto = it.precio * it.cantidad * ratio;
    const n = bruto / (1 + it.iva / 100);
    neto += n;
    porAlicuota.set(it.iva, (porAlicuota.get(it.iva) ?? 0) + (bruto - n));
  }
  const iva = doc.total - neto;
  const emp = doc.empresa;
  const barras = isRemito ? null : codigoBarrasAfip(doc, codTipo);
  const numero = doc.numero.replace(/^[A-Z ]+/, "");
  const tipoDoc = doc.clienteTipoDoc && doc.clienteTipoDoc !== "SIN" ? doc.clienteTipoDoc : "DNI";

  return (
    <div className="border line-70 p-5 text-[11px] text-black">
      <div className="mb-2 text-center text-[10px] font-bold tracking-widest ink-60">{etiqueta}</div>
      <div className="flex items-start justify-between border-b line-40 pb-2">
        <div className="w-1/3">
          <p className="font-bold">{emp.razonSocial}</p>
          <p className="mt-1 leading-snug ink-70">
            {emp.titular.toUpperCase()}
            <br />
            {emp.domicilio}
            <br />
            Tel.: {emp.telefono}
            {emp.email && (
              <>
                <br />
                e-mail: {emp.email}
              </>
            )}
            {emp.whatsapp && (
              <>
                <br />
                WhatsApp {emp.whatsapp}
              </>
            )}
            <br />
            {emp.condicionIva}
          </p>
        </div>
        <div className="flex w-16 flex-col items-center border line-50 py-1 text-center">
          <span className="text-2xl font-bold">{info.letra}</span>
          <span className="text-[8px]">COD.{codTipo.padStart(2, "0")}</span>
        </div>
        <div className="w-1/3 text-right">
          <p className="font-bold uppercase">{info.nombre.replace(/^Nota de Crédito.*/, "Nota de Crédito")}</p>
          <p>N° {numero}</p>
          <p className="mt-1.5">CUIT: {emp.cuit}</p>
          <p>Inicio Act.: {emp.inicioActividades}</p>
          <p>Ing. Brutos: {emp.ingresosBrutos}</p>
          <p>
            Fecha: {doc.fecha}
            {doc.hora ? ` ${doc.hora}` : ""}
          </p>
        </div>
      </div>

      <div className="border-b line-40 py-2">
        <p>
          <b>CLIENTE:</b> {doc.clienteCodigo ? `<<${doc.clienteCodigo}>> ` : ""}
          {doc.clienteNombre}
          {doc.dni ? `   ${tipoDoc}: ${doc.dni}` : ""}
        </p>
        <p>
          <b>DIRECCIÓN:</b> {doc.clienteDomicilio ?? ""}
        </p>
        <p>
          <b>LOCALIDAD:</b> {doc.clienteLocalidad ?? ""}
        </p>
        <p>
          <b>CONDICIÓN:</b> {doc.condicionPagoLabel}
          {doc.clienteCondicionIva ? `     ${doc.clienteCondicionIva.toUpperCase()}` : ""}
        </p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b line-40 text-left">
            <th className="py-1">CANT.</th>
            <th className="py-1">CÓDIGO</th>
            <th className="py-1">DESCRIPCIÓN</th>
            {!isRemito && <th className="py-1 text-center">IVA</th>}
            <th className="py-1 text-right">P. UNIT.</th>
            <th className="py-1 text-right">%Bon.</th>
            <th className="py-1 text-right">Bon.</th>
            <th className="py-1 text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => {
            const unit = esA ? it.precio / (1 + it.iva / 100) : it.precio;
            return (
              <tr key={i} className="border-b line-10">
                <td className="py-1">{money2(it.cantidad)}</td>
                <td className="py-1">{it.codigo || "S/C"}</td>
                <td className="py-1">
                  {it.descripcion}
                  {it.marca ? ` — ${it.marca}` : ""}
                </td>
                {!isRemito && <td className="py-1 text-center">{money2(it.iva)}</td>}
                <td className="py-1 text-right">{money2(unit)}</td>
                <td className="py-1 text-right">0,00</td>
                <td className="py-1 text-right">0,00</td>
                <td className="py-1 text-right">{money2(unit * it.cantidad)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex items-start justify-between">
        <div className="w-1/2">
          <p>SON PESOS: {amountToWords(doc.total)}</p>
          {!isRemito &&
            [...porAlicuota.entries()].map(([a, v]) => (
              <p key={a} className="mt-1">
                IVA {a.toFixed(2)} {v.toFixed(2)}
              </p>
            ))}
        </div>
        <div className="w-52">
          <div className="flex justify-between border-b line-10 py-0.5">
            <span>NETO $:</span>
            <span>{money2(esA || isRemito ? neto : doc.total)}</span>
          </div>
          <div className="flex justify-between border-b line-10 py-0.5">
            <span>BONIF $:</span>
            <span>{money2(doc.descuento)}</span>
          </div>
          <div className="flex justify-between border-b line-10 py-0.5">
            <span>SUBTOT $:</span>
            <span>{money2(esA || isRemito ? neto : doc.total)}</span>
          </div>
          {esA && (
            <div className="flex justify-between border-b line-10 py-0.5">
              <span>IVA $:</span>
              <span>{money2(iva)}</span>
            </div>
          )}
          <div className="flex justify-between py-0.5 font-bold">
            <span>TOTAL $:</span>
            <span>{money2(doc.total)}</span>
          </div>
        </div>
      </div>

      {!isRemito ? (
        <div className="mt-3 border-t line-40 pt-2">
          <p>
            CAE N°: {doc.cae} &nbsp;&nbsp; Vto. CAE: {doc.caeVencimiento}
          </p>
          {barras && (
            <div className="mt-2">
              <BarrasI25 codigo={barras} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 flex justify-end gap-10 text-center text-[10px]">
          <div className="w-32 border-t line-50 pt-1">Firma del cliente</div>
          <div className="w-32 border-t line-50 pt-1">Aclaración</div>
          <div className="w-24 border-t line-50 pt-1">DNI</div>
        </div>
      )}
    </div>
  );
}

function Copias({ doc }: { doc: ComprobanteDocData }) {
  const info = DOC_LABELS[doc.docType];
  const isRemito = !info.hasCae;

  if (isRemito) {
    return (
      <div data-pdf-page className="print-remito-page bg-white p-4">
        <Copia doc={doc} etiqueta="COPIA CLIENTE" />
        <div className="my-2 border-t border-dashed line-40" />
        <Copia doc={doc} etiqueta="COPIA NEGOCIO — FIRMA DEL CLIENTE" />
      </div>
    );
  }

  return (
    <>
      <div data-pdf-page className="print-page-full bg-white p-6">
        <Copia doc={doc} etiqueta="ORIGINAL" />
      </div>
      <div data-pdf-page className="print-page-full bg-white p-6">
        <Copia doc={doc} etiqueta="DUPLICADO" />
      </div>
    </>
  );
}

export default function ComprobantePrint({
  doc,
  onClose,
}: {
  doc: ComprobanteDocData;
  onClose: () => void;
}) {
  const info = DOC_LABELS[doc.docType];
  const previewRef = useRef<HTMLDivElement>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!previewRef.current) return;
    setGuardando(true);
    try {
      await descargarComoPDF(previewRef.current, `${doc.numero.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:hidden">
        <div className="relative flex max-h-full w-full max-w-xl flex-col rounded-[var(--radius-app)] border border-border bg-surface shadow-lg">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-sm hover:text-danger"
          >
            ✕
          </button>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
              {info.nombre} {doc.numero}
            </h2>
            <span className="text-xs text-ink-faint">Ya se guardó en el sistema</span>
          </div>

          <div className="overflow-y-auto bg-bg p-4">
            <div ref={previewRef} className="flex flex-col gap-3 shadow-sm">
              <Copias doc={doc} />
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-5 py-3.5">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg disabled:opacity-60"
            >
              {guardando ? "Generando…" : "Guardar"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark"
            >
              🖨 Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="print-only hidden print:block">
        <Copias doc={doc} />
      </div>
    </>
  );
}
