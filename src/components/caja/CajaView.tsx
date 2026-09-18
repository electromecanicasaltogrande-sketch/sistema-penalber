"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { VentaRow } from "@/lib/ventas/historial";

interface Ajuste {
  id: string;
  fecha: string;
  monto: number;
  motivo: string;
}

export default function CajaView({
  initialVentasHoy,
  initialAjustes,
}: {
  initialVentasHoy: VentaRow[];
  initialAjustes: Ajuste[];
}) {
  const [ventas, setVentas] = useState(initialVentasHoy);
  const [ajustes] = useState(initialAjustes);

  useEffect(() => {
    const supabase = createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const channel = supabase
      .channel("caja-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventas" }, (payload) => {
        const v = payload.new as VentaRow;
        if (new Date(v.creado_en) >= startOfDay) {
          setVentas((prev) => [v, ...prev]);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { vendidoEfectivo, vendidoFacturado, otros, totalDia } = useMemo(() => {
    let vendidoEfectivo = 0;
    let vendidoFacturado = 0;
    let otros = 0;
    let totalDia = 0;
    for (const v of ventas) {
      const esNC = v.doc_type.startsWith("nc_");
      const signo = esNC ? -1 : 1;
      totalDia += signo * v.total;
      if (v.condicion_pago === "efectivo") vendidoEfectivo += v.total;
      else otros += v.total;
      if (v.doc_type.startsWith("factura")) vendidoFacturado += v.total;
    }
    for (const a of ajustes) {
      vendidoEfectivo += a.monto;
      totalDia += a.monto;
    }
    return { vendidoEfectivo, vendidoFacturado, otros, totalDia };
  }, [ventas, ajustes]);

  const metrics = [
    { label: "Vendido en efectivo", value: vendidoEfectivo },
    { label: "Vendido facturado", value: vendidoFacturado },
    { label: "Otros (transf. / tarjeta / cta.cte.)", value: otros },
    { label: "Taller", value: 0 },
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{m.label}</p>
            <p className="mt-1.5 font-mono text-xl font-bold text-ink">{money(m.value)}</p>
          </div>
        ))}
        <div className="rounded-[var(--radius-app)] border border-copper/40 bg-copper-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-copper-dark">Total del día</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-copper-dark">{money(totalDia)}</p>
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold text-ink">Movimientos del día</p>
      <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Comprobante</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Condición</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {ajustes.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-none">
                <td className="px-3 py-2.5">—</td>
                <td className="px-3 py-2.5 font-mono text-xs">Ajuste</td>
                <td className="px-3 py-2.5">{a.motivo}</td>
                <td className="px-3 py-2.5 text-xs">devolución</td>
                <td className="px-3 py-2.5 font-mono font-semibold">
                  {a.monto < 0 ? "-" : ""}
                  {money(Math.abs(a.monto))}
                </td>
              </tr>
            ))}
            {ventas.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-none">
                <td className="px-3 py-2.5">
                  {new Date(v.creado_en).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{v.numero}</td>
                <td className="px-3 py-2.5">{v.cliente_nombre}</td>
                <td className="px-3 py-2.5 text-xs capitalize">{v.condicion_pago.replace("_", " ")}</td>
                <td className="px-3 py-2.5 font-mono font-semibold">
                  {v.doc_type.startsWith("nc_") ? "-" : ""}
                  {money(v.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ventas.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Sin movimientos hoy.</p>
        )}
      </div>
    </div>
  );
}
