"use client";

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

function Contenido({ recibo }: { recibo: ReciboData }) {
  return (
    <div className="bg-white p-8 text-black">
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg font-bold">{recibo.titulo}</h2>
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
  );
}

export default function ReciboPago({ recibo, onClose }: { recibo: ReciboData; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:hidden">
        <div className="flex max-h-full w-full max-w-lg flex-col rounded-[var(--radius-app)] border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
              {recibo.titulo}
            </h2>
            <span className="text-xs text-ink-faint">Ya se guardó en el sistema</span>
          </div>

          <div className="overflow-y-auto bg-bg p-4">
            <div className="shadow-sm">
              <Contenido recibo={recibo} />
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-5 py-3.5">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg"
            >
              Guardar y cerrar
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
        <Contenido recibo={recibo} />
      </div>
    </>
  );
}
