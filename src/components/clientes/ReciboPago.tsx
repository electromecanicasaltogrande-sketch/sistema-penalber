"use client";

import { useEffect } from "react";
import { money } from "@/lib/format";

export interface ReciboLinea {
  comprobante: string;
  detalle: string;
  monto: number;
}

export interface ReciboData {
  titulo: string;
  numero: string;
  cliente: string;
  lineas: ReciboLinea[];
  totalAplicado: number;
  saldoRestante: number;
  fecha: string;
}

export default function ReciboPago({ recibo, onClose }: { recibo: ReciboData; onClose: () => void }) {
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
            {recibo.titulo}
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

      <div className="print-only hidden bg-white p-8 print:block">
        <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg font-bold">
          {recibo.titulo}
        </h2>
        <p className="mb-4 text-xs text-black/60">
          {recibo.numero} · {recibo.fecha} · {recibo.cliente}
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-1.5">Comprobante</th>
              <th className="py-1.5">Detalle</th>
              <th className="py-1.5 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {recibo.lineas.map((l, i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-1.5">{l.comprobante}</td>
                <td className="py-1.5">{l.detalle}</td>
                <td className="py-1.5 text-right">{money(l.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between border-b border-black/10 py-1">
              <span>Total aplicado</span>
              <b>{money(recibo.totalAplicado)}</b>
            </div>
            <div className="flex justify-between py-1">
              <span>Saldo restante</span>
              <b>{money(recibo.saldoRestante)}</b>
            </div>
          </div>
        </div>
        <div className="mt-16 flex justify-end">
          <div className="w-56 border-t border-black/40 pt-1.5 text-center text-xs text-black/60">
            Firma / Aclaración
          </div>
        </div>
      </div>
    </>
  );
}
