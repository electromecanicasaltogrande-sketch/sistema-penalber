"use client";

import { money } from "@/lib/format";
import type { CartItem } from "@/lib/ventas/types";
import type { PresupuestoConfig } from "./types";

export interface PresupuestoPrintData {
  numero: string;
  clienteNombre: string;
  items: CartItem[];
  total: number;
  fecha: string;
  config: PresupuestoConfig;
}

function Contenido({ doc }: { doc: PresupuestoPrintData }) {
  return (
    <div className="bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b border-black/40 pb-3">
        <div>
          <p className="font-bold">Electrotécnica Peñalber</p>
          <p className="text-xs text-black/70">Tavella 1487, Concordia, Entre Ríos</p>
        </div>
        <div className="text-right">
          <p className="font-bold">PRESUPUESTO N° {doc.numero}</p>
          <p className="text-xs">Fecha: {doc.fecha}</p>
        </div>
      </div>

      <p className="mt-4 text-sm">
        <b>Cliente:</b> {doc.clienteNombre}
      </p>
      <p className="mt-3 text-sm">{doc.config.textoIntro}</p>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/40 text-left">
            <th className="py-1.5">Cant.</th>
            <th className="py-1.5">Código</th>
            <th className="py-1.5">Descripción</th>
            <th className="py-1.5 text-right">P. Unit.</th>
            <th className="py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1.5">{it.cantidad}</td>
              <td className="py-1.5">{it.codigo ?? "S/C"}</td>
              <td className="py-1.5">{it.descripcion}</td>
              <td className="py-1.5 text-right">{money(it.precio)}</td>
              <td className="py-1.5 text-right">{money(it.precio * it.cantidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <div className="w-56 border-t border-black/40 pt-1.5 text-right text-base font-bold">
          Total: {money(doc.total)}
        </div>
      </div>

      <p className="mt-6 whitespace-pre-line text-xs text-black/70">{doc.config.observaciones}</p>
      <p className="mt-2 text-xs text-black/70">
        Este presupuesto caduca en {doc.config.diasValidez} días a partir de la fecha.
      </p>

      <div className="mt-16 flex justify-end">
        <div className="w-56 border-t border-black/40 pt-1.5 text-center text-xs">
          <p>{doc.config.firma}</p>
          {doc.config.mostrarEmpresa && <p className="text-black/60">Electrotécnica Peñalber</p>}
        </div>
      </div>
    </div>
  );
}

export default function PresupuestoPrint({
  doc,
  onClose,
}: {
  doc: PresupuestoPrintData;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:hidden">
        <div className="flex max-h-full w-full max-w-xl flex-col rounded-[var(--radius-app)] border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
              Presupuesto {doc.numero}
            </h2>
            <span className="text-xs text-ink-faint">Ya se guardó en el sistema</span>
          </div>

          <div className="overflow-y-auto bg-bg p-4">
            <div className="shadow-sm">
              <Contenido doc={doc} />
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
        <Contenido doc={doc} />
      </div>
    </>
  );
}
