"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { totalFactura, type FacturaCompra, type Proveedor } from "@/lib/proveedores/types";

const FIELD =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

export default function ReportePagosTab({
  proveedores,
  facturas,
  onFacturaUpdated,
}: {
  proveedores: Proveedor[];
  facturas: FacturaCompra[];
  onFacturaUpdated: (f: FacturaCompra) => void;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtradas = useMemo(() => {
    return facturas.filter((f) => {
      if (proveedorId && f.proveedorId !== proveedorId) return false;
      if (desde && f.fechaFactura < desde) return false;
      if (hasta && f.fechaFactura > hasta) return false;
      return true;
    });
  }, [facturas, proveedorId, desde, hasta]);

  const pendientes = filtradas.filter((f) => !f.pagada);
  const pagadas = filtradas.filter((f) => f.pagada);

  function totales(list: FacturaCompra[]) {
    return list.reduce(
      (acc, f) => ({
        neto: acc.neto + f.neto,
        iva: acc.iva + f.iva,
        total: acc.total + totalFactura(f),
      }),
      { neto: 0, iva: 0, total: 0 },
    );
  }
  const totPend = totales(pendientes);
  const totPag = totales(pagadas);
  const totCombinado = totales(filtradas);

  async function togglePagada(f: FacturaCompra) {
    const supabase = createClient();
    await supabase.from("facturas_compra").update({ pagada: !f.pagada }).eq("id", f.id);
    onFacturaUpdated({ ...f, pagada: !f.pagada });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={FIELD}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.razonSocial}
            </option>
          ))}
        </select>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={FIELD} />
        <span className="text-xs text-ink-faint">a</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={FIELD} />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">Neto</th>
              <th className="px-3 py-2">IVA</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-none">
                <td className="px-3 py-2.5">{f.fechaFactura}</td>
                <td className="px-3 py-2.5 text-xs">{f.tipoComprobante}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{f.numero}</td>
                <td className="px-3 py-2.5">{proveedores.find((p) => p.id === f.proveedorId)?.razonSocial ?? "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{money(f.neto)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{money(f.iva)}</td>
                <td className="px-3 py-2.5 font-mono font-semibold">{money(totalFactura(f))}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.pagada ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                    {f.pagada ? "Pagada" : "Pendiente"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => togglePagada(f)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                  >
                    {f.pagada ? "Marcar pendiente" : "Marcar pagada"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Sin facturas para este filtro.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-[var(--radius-app)] border border-border bg-warning-soft p-4">
          <p className="text-[11px] font-semibold uppercase text-warning">Pendiente</p>
          <p className="mt-1 text-xs text-ink-soft">Neto {money(totPend.neto)} · IVA {money(totPend.iva)}</p>
          <p className="mt-1 font-mono text-lg font-bold text-warning">{money(totPend.total)}</p>
        </div>
        <div className="rounded-[var(--radius-app)] border border-border bg-success-soft p-4">
          <p className="text-[11px] font-semibold uppercase text-success">Ya pagado</p>
          <p className="mt-1 text-xs text-ink-soft">Neto {money(totPag.neto)} · IVA {money(totPag.iva)}</p>
          <p className="mt-1 font-mono text-lg font-bold text-success">{money(totPag.total)}</p>
        </div>
        <div className="rounded-[var(--radius-app)] border border-border bg-bg p-4">
          <p className="text-[11px] font-semibold uppercase text-ink-faint">Total combinado</p>
          <p className="mt-1 text-xs text-ink-soft">Neto {money(totCombinado.neto)} · IVA {money(totCombinado.iva)}</p>
          <p className="mt-1 font-mono text-lg font-bold text-ink">{money(totCombinado.total)}</p>
        </div>
      </div>
    </div>
  );
}
