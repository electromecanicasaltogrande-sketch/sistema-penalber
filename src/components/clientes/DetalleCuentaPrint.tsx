"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/format";
import { descargarComoPDF } from "@/lib/print-pdf";
import { EMPRESAS } from "@/lib/empresas";
import { saldo, type CtaCteComprobante } from "@/lib/clientes/types";

export interface DetalleCuentaData {
  clienteNombre: string;
  clienteCuit: string;
  clienteCodigo?: string;
  clienteDomicilio?: string;
  clienteLocalidad?: string;
  empresaCuit?: string;
  comprobantes: CtaCteComprobante[];
  fecha: string;
  hora?: string;
}

function Contenido({ doc }: { doc: DetalleCuentaData }) {
  const totalDeuda = doc.comprobantes.reduce((s, c) => s + saldo(c), 0);
  const emp = EMPRESAS.find((e) => e.cuit === doc.empresaCuit) ?? EMPRESAS[0];
  const ubicacion = [doc.clienteDomicilio, doc.clienteLocalidad].filter(Boolean).join(" - ");
  return (
    <div className="bg-white p-8 text-[12px] text-black">
      <p className="text-right ink-60">
        {doc.fecha} {doc.hora ?? ""}
      </p>
      <div className="flex items-start justify-between border-b line-40 pb-3">
        <div>
          <p className="font-bold">{emp.domicilio}</p>
          {emp.whatsapp && <p className="ink-70">{emp.whatsapp}</p>}
          {emp.email && <p className="ink-70">{emp.email}</p>}
        </div>
        <p className="text-lg font-bold">Estado de Deuda</p>
      </div>

      <p className="mt-3">
        <b>Cliente:</b> {doc.clienteCodigo ? `${doc.clienteCodigo} ` : ""}
        {doc.clienteNombre}
        {doc.clienteCuit ? ` · CUIT/CUIL: ${doc.clienteCuit}` : ""}
        {ubicacion ? ` / ${ubicacion}` : ""}
      </p>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-b line-40 text-left">
            <th className="py-1">Fecha</th>
            <th className="py-1">Descripción</th>
            <th className="py-1 text-right">Debe</th>
            <th className="py-1 text-right">Haber</th>
          </tr>
        </thead>
        <tbody>
          {doc.comprobantes.map((cp) => (
            <tr key={cp.id} className="border-b line-10">
              <td className="py-1">{fechaCorta(cp.fecha)}</td>
              <td className="py-1">
                {cp.tipo} {cp.numero}
              </td>
              <td className="py-1 text-right">{cp.total.toFixed(2)}</td>
              <td className="py-1 text-right">{cp.montoPagado.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <div className="w-64 border-t line-40 pt-1.5 text-right text-base font-bold">
          Saldo Total {totalDeuda.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default function DetalleCuentaPrint({ doc, onClose }: { doc: DetalleCuentaData; onClose: () => void }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!previewRef.current) return;
    setGuardando(true);
    try {
      await descargarComoPDF(
        previewRef.current,
        `Detalle_Cuenta_${doc.clienteNombre.replace(/\s+/g, "_")}.pdf`,
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:hidden">
        <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-[var(--radius-app)] border border-border bg-surface shadow-lg">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-sm hover:text-danger"
          >
            ✕
          </button>
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
              Detalle de cuenta — {doc.clienteNombre}
            </h2>
          </div>

          <div className="overflow-y-auto bg-bg p-4">
            <div ref={previewRef} className="shadow-sm">
              <Contenido doc={doc} />
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
        <Contenido doc={doc} />
      </div>
    </>
  );
}
