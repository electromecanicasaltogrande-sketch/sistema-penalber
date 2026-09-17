"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { VentaRow } from "@/lib/ventas/historial";

interface FacturaCompraLite {
  id: string;
  tipo_comprobante: string;
  neto: number;
  iva: number;
  otros_impuestos: number;
  fecha_factura: string;
}
interface ReparacionLite {
  id: string;
  total: number;
  entregada: boolean;
  creado_en: string;
}
interface PresupuestoTallerLite {
  id: string;
  estado: string;
  cobro_no_hizo: number | null;
  creado_en: string;
}

const FIELD =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

function primerDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportesView({
  ventas,
  facturasCompra,
  reparaciones,
  presupuestosTaller,
}: {
  ventas: VentaRow[];
  facturasCompra: FacturaCompraLite[];
  reparaciones: ReparacionLite[];
  presupuestosTaller: PresupuestoTallerLite[];
}) {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());

  const enRango = (fecha: string) => fecha.slice(0, 10) >= desde && fecha.slice(0, 10) <= hasta;

  const ventasFiltradas = useMemo(() => ventas.filter((v) => enRango(v.creado_en)), [ventas, desde, hasta]);
  const comprasFiltradas = useMemo(() => facturasCompra.filter((f) => enRango(f.fecha_factura)), [facturasCompra, desde, hasta]);
  const reparacionesFiltradas = useMemo(() => reparaciones.filter((r) => enRango(r.creado_en)), [reparaciones, desde, hasta]);
  const presTallerFiltrados = useMemo(() => presupuestosTaller.filter((p) => enRango(p.creado_en)), [presupuestosTaller, desde, hasta]);

  const ventasReporte = useMemo(() => {
    let efectivo = 0;
    let facturado = 0;
    let totalReal = 0;
    for (const v of ventasFiltradas) {
      const esNC = v.doc_type.startsWith("nc_");
      const signo = esNC ? -1 : 1;
      totalReal += signo * v.total;
      if (v.condicion_pago === "efectivo") efectivo += signo * v.total;
      if (v.doc_type.startsWith("factura")) facturado += signo * v.total;
    }
    return { efectivo, facturado, totalReal };
  }, [ventasFiltradas]);

  const comprasReporte = useMemo(() => {
    let facturado = 0;
    let remito = 0;
    for (const f of comprasFiltradas) {
      const total = f.neto + f.iva + f.otros_impuestos;
      if (f.tipo_comprobante === "Remito") remito += total;
      else facturado += total;
    }
    return { facturado, remito, total: facturado + remito };
  }, [comprasFiltradas]);

  const tallerReporte = useMemo(() => {
    const reparacionesCobradas = reparacionesFiltradas
      .filter((r) => r.entregada)
      .reduce((s, r) => s + r.total, 0);
    const presupuestosNoRealizados = presTallerFiltrados
      .filter((p) => p.estado === "NoLoHizo")
      .reduce((s, p) => s + (p.cobro_no_hizo ?? 0), 0);
    return { reparacionesCobradas, presupuestosNoRealizados, total: reparacionesCobradas + presupuestosNoRealizados };
  }, [reparacionesFiltradas, presTallerFiltrados]);

  const diferencia = ventasReporte.totalReal - comprasReporte.total;

  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5">
        <label className="text-xs font-semibold text-ink-soft">Período</label>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={FIELD} />
        <span className="text-xs text-ink-faint">a</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Seccion titulo="Ventas">
          <Fila label="Cobrado en efectivo" value={ventasReporte.efectivo} />
          <Fila label="Vendido facturado" value={ventasReporte.facturado} />
          <p className="mt-1 text-[11px] text-ink-faint">
            Estas dos cifras pueden superponerse (una venta facturada puede haberse cobrado en efectivo).
          </p>
          <Fila label="Total vendido (real)" value={ventasReporte.totalReal} strong />
        </Seccion>

        <Seccion titulo="Compras de mercadería">
          <Fila label="Comprado facturado" value={comprasReporte.facturado} />
          <Fila label="Comprado por remito" value={comprasReporte.remito} />
          <Fila label="Total comprado" value={comprasReporte.total} strong />
        </Seccion>

        <Seccion titulo="Taller">
          <Fila label="Reparaciones cobradas (entregadas)" value={tallerReporte.reparacionesCobradas} />
          <Fila label="Presupuestos no realizados (cobro)" value={tallerReporte.presupuestosNoRealizados} />
          <Fila label="Total taller" value={tallerReporte.total} strong />
        </Seccion>

        <Seccion titulo="Comprado vs. Vendido">
          <Fila label="Vendido (real)" value={ventasReporte.totalReal} />
          <Fila label="Comprado (total)" value={comprasReporte.total} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
            <span>{diferencia >= 0 ? "Se vendió más de lo que se compró" : "Se compró más de lo que se vendió"}</span>
            <span className={`font-mono ${diferencia >= 0 ? "text-success" : "text-danger"}`}>{money(Math.abs(diferencia))}</span>
          </div>
        </Seccion>
      </div>

      <div className="mt-4 rounded-[var(--radius-app)] border border-dashed border-border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Más reportes</p>
        <p className="mt-1 text-xs text-ink-faint">
          Rentabilidad, comparativo mensual, ventas por rubro y por vendedor — pendientes de diseño.
        </p>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-ink">{titulo}</p>
      {children}
    </div>
  );
}

function Fila({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${strong ? "font-bold" : "text-ink-soft"}`}>
      <span>{label}</span>
      <span className="font-mono">{money(value)}</span>
    </div>
  );
}
