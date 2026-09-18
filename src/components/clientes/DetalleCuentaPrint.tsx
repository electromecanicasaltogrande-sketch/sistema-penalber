"use client";

import { useRef, useState } from "react";
import { money } from "@/lib/format";
import { descargarComoPDF } from "@/lib/print-pdf";
import { empresaCorta } from "@/lib/empresas";
import { saldo, type CtaCteComprobante } from "@/lib/clientes/types";

export interface DetalleCuentaData {
  clienteNombre: string;
  clienteCuit: string;
  comprobantes: CtaCteComprobante[];
  fecha: string;
}

function Contenido({ doc }: { doc: DetalleCuentaData }) {
  const totalDeuda = doc.comprobantes.reduce((s, c) => s + saldo(c), 0);
  return (
    <div className="bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b line-40 pb-3">
        <div>
          <p className="font-bold">Electrotécnica Peñalber</p>
          <p className="text-xs ink-70">Tavella 1487, Concordia, Entre Ríos</p>
        </div>
        <div className="text-right">
          <p className="font-bold">DETALLE DE CUENTA</p>
          <p className="text-xs">Fecha: {doc.fecha}</p>
        </div>
      </div>

      <p className="mt-4 text-sm">
        <b>Cliente:</b> {doc.clienteNombre} {doc.clienteCuit ? `· CUIT/CUIL: ${doc.clienteCuit}` : ""}
      </p>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b line-40 text-left">
            <th className="py-1.5">Fecha</th>
            <th className="py-1.5">Comprobante</th>
            <th className="py-1.5">Empresa</th>
            <th className="py-1.5 text-right">Total</th>
            <th className="py-1.5 text-right">Pagado</th>
            <th className="py-1.5 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {doc.comprobantes.map((cp) => (
            <tr key={cp.id} className="border-b line-10">
              <td className="py-1.5">{cp.fecha}</td>
              <td className="py-1.5">
                {cp.tipo} — {cp.numero}
              </td>
              <td className="py-1.5">{empresaCorta(cp.empresaCuit)}</td>
              <td className="py-1.5 text-right">{money(cp.total)}</td>
              <td className="py-1.5 text-right">{money(cp.montoPagado)}</td>
              <td className="py-1.5 text-right">{money(saldo(cp))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <div className="w-64 border-t line-40 pt-1.5 text-right text-base font-bold">
          Saldo total adeudado: {money(totalDeuda)}
        </div>
      </div>
    </div>
  );
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
