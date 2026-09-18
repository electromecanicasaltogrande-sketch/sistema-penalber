"use client";

import { useMemo } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { diasHasta, estadoCheque, type Cheque } from "@/lib/cheques/types";
import type { VentaRow } from "@/lib/ventas/historial";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DashboardView({
  ventas7dias,
  cheques,
}: {
  ventas7dias: VentaRow[];
  cheques: Cheque[];
}) {
  const hoy = ymd(new Date());

  const ventasHoy = useMemo(() => ventas7dias.filter((v) => v.creado_en.slice(0, 10) === hoy), [ventas7dias, hoy]);

  const totalHoy = ventasHoy.reduce((s, v) => s + (v.doc_type.startsWith("nc_") ? -v.total : v.total), 0);
  const efectivoHoy = ventasHoy.filter((v) => v.condicion_pago === "efectivo").reduce((s, v) => s + v.total, 0);
  const facturadoHoy = ventasHoy.filter((v) => v.doc_type.startsWith("factura")).reduce((s, v) => s + v.total, 0);

  const dias = useMemo(() => {
    const arr: { fecha: string; label: string; efectivo: number; facturado: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymd(d);
      const delDia = ventas7dias.filter((v) => v.creado_en.slice(0, 10) === key);
      arr.push({
        fecha: key,
        label: d.toLocaleDateString("es-AR", { weekday: "short" }),
        efectivo: delDia.filter((v) => v.condicion_pago === "efectivo").reduce((s, v) => s + v.total, 0),
        facturado: delDia.filter((v) => v.doc_type.startsWith("factura")).reduce((s, v) => s + v.total, 0),
      });
    }
    return arr;
  }, [ventas7dias]);

  const maxDia = Math.max(1, ...dias.map((d) => d.efectivo + d.facturado));

  const chequesProximos = cheques
    .filter((c) => diasHasta(c.fechaVencimiento) <= 10)
    .slice(0, 10);

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Metric label="Ventas totales de hoy" value={money(totalHoy)} />
        <Metric label="Vendido en efectivo" value={money(efectivoHoy)} />
        <Metric label="Vendido facturado" value={money(facturadoHoy)} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-1 text-sm font-semibold text-ink">Ventas de los últimos 7 días</p>
          <p className="mb-3 text-xs text-ink-faint">Efectivo vs. facturado</p>
          <div className="flex h-32 items-end gap-2.5">
            {dias.map((d) => (
              <div key={d.fecha} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-t bg-bg" style={{ height: 110 }}>
                  <div
                    className="bg-ink"
                    style={{ height: `${(d.efectivo / maxDia) * 110}px` }}
                  />
                  <div
                    className="bg-copper"
                    style={{ height: `${(d.facturado / maxDia) * 110}px` }}
                  />
                </div>
                <span className="text-[10px] capitalize text-ink-faint">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink" /> Efectivo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-copper" /> Facturado
            </span>
          </div>
        </div>

        <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-ink">Cheques próximos a vencer</p>
          {chequesProximos.length === 0 ? (
            <p className="text-sm text-ink-faint">Nada por cobrar en los próximos 10 días.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {chequesProximos.map((c) => {
                const estado = estadoCheque(c);
                return (
                  <Link
                    key={c.id}
                    href="/cheques"
                    className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-bg"
                  >
                    <span>{c.titular}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        estado === "vencido" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                      }`}
                    >
                      {money(c.importe)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-bold ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}
