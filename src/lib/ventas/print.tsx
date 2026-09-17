"use client";

import { useEffect } from "react";
import { money } from "@/lib/format";
import type { Empresa } from "@/lib/empresas";
import { DOC_LABELS, type CartItem, type DocType } from "./types";

export interface ComprobanteDocData {
  docType: DocType;
  numero: string;
  empresa: Empresa;
  clienteNombre: string;
  dni?: string;
  condicionPagoLabel: string;
  items: CartItem[];
  subtotal: number;
  descuento: number;
  total: number;
  cae?: string;
  caeVencimiento?: string;
  fecha: string;
}

function amountToWords(n: number): string {
  return "PESOS " + Math.round(n).toLocaleString("es-AR") + " con 00/100.-";
}

function Copia({ doc, etiqueta }: { doc: ComprobanteDocData; etiqueta: string }) {
  const info = DOC_LABELS[doc.docType];
  const isRemito = !info.hasCae;
  const neto = doc.total / 1.21;
  const iva = doc.total - neto;

  return (
    <div className="mb-6 border border-black/70 p-5 text-[11px] text-black last:mb-0">
      <div className="mb-2 text-center text-[10px] font-bold tracking-widest text-black/60">
        {etiqueta}
      </div>
      <div className="flex items-start justify-between border-b border-black/40 pb-2">
        <div className="w-1/3">
          <p className="font-bold">{doc.empresa.razonSocial}</p>
          <p className="mt-1 leading-snug text-black/70">
            Tavella 1487, Concordia, Entre Ríos
            <br />
            Tel.: (0345) 000-0000 · WhatsApp disponible
            <br />
            Resp. Inscripto
          </p>
        </div>
        <div className="flex w-16 flex-col items-center border border-black/50 py-1 text-center">
          <span className="text-2xl font-bold">{info.letra}</span>
          <span className="text-[8px]">COD.{isRemito ? "91" : "01"}</span>
        </div>
        <div className="w-1/3 text-right">
          <p className="font-bold uppercase">{info.nombre}</p>
          <p>N° {doc.numero.replace(/^[A-Z ]+/, "")}</p>
          <p className="mt-1.5">CUIT: {doc.empresa.cuit}</p>
          <p>Fecha: {doc.fecha}</p>
        </div>
      </div>

      <div className="border-b border-black/40 py-2">
        <p>
          <b>CLIENTE:</b> {doc.clienteNombre} {doc.dni ? `DNI: ${doc.dni}` : ""}
        </p>
        <p>
          <b>CONDICIÓN:</b> {doc.condicionPagoLabel}
        </p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black/40 text-left">
            <th className="py-1">CANT.</th>
            <th className="py-1">CÓDIGO</th>
            <th className="py-1">DESCRIPCIÓN</th>
            <th className="py-1 text-center">IVA</th>
            <th className="py-1 text-right">P.UNIT</th>
            <th className="py-1 text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1">{it.cantidad}</td>
              <td className="py-1">{it.codigo || "S/C"}</td>
              <td className="py-1">
                {it.descripcion}
                {it.marca ? ` — ${it.marca}` : ""}
              </td>
              <td className="py-1 text-center">{it.iva}.0</td>
              <td className="py-1 text-right">{it.precio.toFixed(2)}</td>
              <td className="py-1 text-right">{(it.precio * it.cantidad).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-start justify-between">
        <div className="w-1/2">
          <p>SON: {amountToWords(doc.total)}</p>
          <p className="mt-2">IVA 21,00 {iva.toFixed(2)}</p>
        </div>
        <div className="w-48">
          <div className="flex justify-between border-b border-black/10 py-0.5">
            <span>NETO $:</span>
            <span>{neto.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-b border-black/10 py-0.5">
            <span>BONIF $:</span>
            <span>{doc.descuento.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-b border-black/10 py-0.5">
            <span>IVA $:</span>
            <span>{iva.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-0.5 font-bold">
            <span>TOTAL $:</span>
            <span>{doc.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isRemito ? (
        <div className="mt-3 flex items-center justify-between border-t border-black/40 pt-2">
          <div>
            CAE N°: {doc.cae} &nbsp;&nbsp; Vto. CAE: {doc.caeVencimiento}
          </div>
          <div className="h-8 w-32 bg-[repeating-linear-gradient(90deg,#000,#000_1px,transparent_1px,transparent_3px)]" />
        </div>
      ) : (
        <div className="mt-6 flex justify-end gap-10 text-center text-[10px]">
          <div className="w-32 border-t border-black/50 pt-1">Firma del cliente</div>
          <div className="w-32 border-t border-black/50 pt-1">Aclaración</div>
          <div className="w-24 border-t border-black/50 pt-1">DNI</div>
        </div>
      )}
    </div>
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
  const isRemito = !info.hasCae;

  useEffect(() => {
    const after = () => onClose();
    window.addEventListener("afterprint", after);
    const t = setTimeout(() => window.print(), 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 print:hidden">
        <div className="w-full max-w-md rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
            {info.nombre} {doc.numero}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">Se abrió el diálogo de impresión.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="print-only hidden bg-white p-6 print:block">
        {isRemito ? (
          <>
            <Copia doc={doc} etiqueta="COPIA CLIENTE" />
            <p className="my-2 border-t border-dashed border-black/50 py-1 text-center text-[10px]">
              ✂ cortar acá — el cliente firma la copia de abajo como constancia
            </p>
            <Copia doc={doc} etiqueta="COPIA NEGOCIO — FIRMA DEL CLIENTE" />
          </>
        ) : (
          <>
            <Copia doc={doc} etiqueta="ORIGINAL" />
            <Copia doc={doc} etiqueta="DUPLICADO" />
            <Copia doc={doc} etiqueta="TRIPLICADO" />
          </>
        )}
      </div>
    </>
  );
}
