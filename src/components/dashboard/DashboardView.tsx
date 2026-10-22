"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { diasHasta, type Cheque } from "@/lib/cheques/types";

export interface VentaDash {
  creado_en: string;
  total: number;
  doc_type: string;
  condicion_pago: string;
  cliente_nombre: string;
  empresa_cuit: string;
}

const FORMAS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "cheque", label: "Cheque / eCheq" },
  { id: "cta_cte", label: "Cuenta corriente" },
] as const;

const VERDE = "#2f8f5b";
const COBRE = "#be6a2e";

const fmtDia = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
const diaAr = (d: Date | string) => fmtDia.format(typeof d === "string" ? new Date(d) : d);

function corto(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3).toLocaleString("es-AR")} k`;
  return `$${Math.round(n)}`;
}

// Forma de cobro de una venta (las notas de crédito no suman a ninguna).
function formaDe(v: VentaDash): string | null {
  if (v.doc_type.startsWith("nc_") || v.condicion_pago === "nc") return null;
  if (v.condicion_pago === "echeq") return "cheque";
  return FORMAS.some((f) => f.id === v.condicion_pago) ? v.condicion_pago : "efectivo";
}

const neto = (v: VentaDash) => (v.doc_type.startsWith("nc_") ? -Number(v.total) : Number(v.total));

export default function DashboardView({ ventas, cheques }: { ventas: VentaDash[]; cheques: Cheque[] }) {
  const [rango, setRango] = useState<7 | 14 | 30>(14);
  const [hover, setHover] = useState<number | null>(null);

  const porDia = useMemo(() => {
    const m = new Map<string, { total: number; n: number; facturado: number; nFact: number; formas: Record<string, number> }>();
    for (const v of ventas) {
      const k = diaAr(v.creado_en);
      const d = m.get(k) ?? { total: 0, n: 0, facturado: 0, nFact: 0, formas: {} };
      d.total += neto(v);
      d.n += 1;
      if (v.doc_type.startsWith("factura")) {
        d.facturado += Number(v.total);
        d.nFact += 1;
      }
      const f = formaDe(v);
      if (f) d.formas[f] = (d.formas[f] ?? 0) + Number(v.total);
      m.set(k, d);
    }
    return m;
  }, [ventas]);

  const diasAtras = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return diaAr(d);
  };

  const dHoy = porDia.get(diasAtras(0));
  const dAyer = porDia.get(diasAtras(1));
  const totalHoy = dHoy?.total ?? 0;
  const variacion = dAyer && dAyer.total > 0 ? ((totalHoy - dAyer.total) / dAyer.total) * 100 : null;

  const spark = useMemo(
    () => Array.from({ length: 7 }, (_, i) => porDia.get(diasAtras(6 - i))?.total ?? 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porDia],
  );

  const dias = useMemo(
    () =>
      Array.from({ length: rango }, (_, i) => {
        const key = diasAtras(rango - 1 - i);
        const d = porDia.get(key);
        const fecha = new Date(key + "T12:00:00");
        const efectivo = d?.formas.efectivo ?? 0;
        const otros = Object.entries(d?.formas ?? {}).reduce((s, [k, v]) => (k === "efectivo" ? s : s + v), 0);
        return {
          key,
          label: rango <= 7 ? fecha.toLocaleDateString("es-AR", { weekday: "short" }) : fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
          efectivo,
          otros,
          suma: efectivo + otros,
          n: d?.n ?? 0,
          total: d?.total ?? 0,
          formas: d?.formas ?? {},
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [porDia, rango],
  );

  const maxDia = Math.max(1, ...dias.map((d) => d.suma));
  const dHover = hover !== null ? dias[hover] : null;

  const chequesOrdenados = [...cheques].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const chequesProximos = chequesOrdenados.slice(0, 5);
  const totalCheques = cheques.reduce((s, c) => s + c.importe, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <Kpi
          i={0}
          titulo="Ventas de hoy"
          valor={money(totalHoy)}
          detalle={`${dHoy?.n ?? 0} comprobante${(dHoy?.n ?? 0) === 1 ? "" : "s"}`}
          variacion={variacion}
          color={COBRE}
          spark={spark}
        />
        <Kpi
          i={1}
          titulo="Efectivo de hoy"
          valor={money(dHoy?.formas.efectivo ?? 0)}
          detalle="Ventas pagadas en efectivo (incluye remitos)"
          color={VERDE}
        />
        <Kpi
          i={2}
          titulo="Facturado hoy"
          valor={money(dHoy?.facturado ?? 0)}
          detalle={`${dHoy?.nFact ?? 0} factura${(dHoy?.nFact ?? 0) === 1 ? "" : "s"} A, B o C`}
          color="#4a78a8"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="dash-enter rounded-[var(--radius-app)] border border-border bg-surface p-4" style={{ ["--i" as string]: 3 }}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Ventas por día</h2>
              <p className="flex items-center gap-3 text-xs text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: VERDE }} />
                  Efectivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COBRE }} />
                  Otros medios
                </span>
              </p>
            </div>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRango(r)}
                  className={`dash-press rounded-full border px-3 py-1 text-xs font-medium ${
                    rango === r ? "border-copper bg-copper text-white" : "border-border text-ink-soft hover:bg-bg"
                  }`}
                >
                  {r} días
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-52 pl-12">
            {[0, 50, 100].map((p) => (
              <div key={p} className="pointer-events-none absolute left-0 right-0" style={{ bottom: `calc(${p}% * 0.88 + 22px)` }}>
                <span className="absolute -top-2 left-0 w-10 text-right text-[10px] text-ink-faint">{corto((maxDia * p) / 100)}</span>
                <div className="ml-12 border-t border-dashed border-border" />
              </div>
            ))}
            <div key={rango} className="dash-bars relative flex h-full items-end gap-1 pb-[22px]">
              {dias.map((d, i) => (
                <div
                  key={d.key}
                  className="relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className="dash-bar flex w-full max-w-[34px] flex-col-reverse overflow-hidden rounded-t"
                    style={{ height: `${(d.suma / maxDia) * 88}%`, ["--i" as string]: i }}
                  >
                    <div style={{ height: d.suma ? `${(d.efectivo / d.suma) * 100}%` : 0, background: VERDE }} />
                    <div style={{ height: d.suma ? `${(d.otros / d.suma) * 100}%` : 0, background: COBRE }} />
                  </div>
                  <span className="absolute top-full mt-1 text-[10px] capitalize text-ink-faint">{rango === 30 && i % 2 === 1 ? "" : d.label}</span>
                </div>
              ))}
            </div>
            {dHover && (
              <div className="dash-tip pointer-events-none absolute right-2 top-0 z-10 w-52 rounded-lg border border-border bg-surface p-2.5 text-xs shadow-lg">
                <p className="mb-1 font-semibold capitalize text-ink">
                  {new Date(dHover.key + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {FORMAS.filter((f) => dHover.formas[f.id]).map((f) => (
                  <p key={f.id} className="flex items-center justify-between gap-2 text-ink-soft">
                    <span>{f.label}</span>
                    <span className="font-mono">{money(dHover.formas[f.id])}</span>
                  </p>
                ))}
                {dHover.n === 0 && <p className="text-ink-faint">Sin ventas.</p>}
                <p className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-ink">
                  <span>{dHover.n} comp.</span>
                  <span className="font-mono">{money(dHover.total)}</span>
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="dash-enter rounded-[var(--radius-app)] border border-border bg-surface p-4" style={{ ["--i" as string]: 4 }}>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Cheques por cobrar</h2>
              <p className="text-xs text-ink-faint">
                {cheques.length} pendiente{cheques.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-ink">{corto(totalCheques)}</span>
          </div>
          {chequesProximos.length === 0 ? (
            <p className="text-sm text-ink-faint">No hay cheques pendientes.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {chequesProximos.map((c) => {
                const dias = diasHasta(c.fechaVencimiento);
                const texto = dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? "Vence hoy" : dias === 1 ? "Mañana" : `En ${dias} días`;
                const clase = dias < 0 ? "bg-danger-soft text-danger" : dias <= 3 ? "bg-warning-soft text-warning" : "bg-bg text-ink-soft";
                return (
                  <Link key={c.id} href="/cheques" className="dash-press flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-bg">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{c.titular}</span>
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${clase}`}>{texto}</span>
                    </span>
                    <span className="font-mono font-semibold text-ink">{money(c.importe)}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <Link href="/cheques" className="mt-3 block text-xs font-semibold text-copper hover:underline">
            Ver todos los cheques →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  i,
  titulo,
  valor,
  detalle,
  variacion,
  color,
  spark,
}: {
  i: number;
  titulo: string;
  valor: string;
  detalle?: string;
  variacion?: number | null;
  color: string;
  spark?: number[];
}) {
  const max = Math.max(1, ...(spark ?? [1]));
  return (
    <div
      className="dash-enter dash-card relative overflow-hidden rounded-[var(--radius-app)] border border-border bg-surface p-4"
      style={{ ["--i" as string]: i }}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{titulo}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="font-mono text-2xl font-bold text-ink">{valor}</p>
        {spark && (
          <svg viewBox="0 0 70 26" className="h-7 w-[70px] shrink-0" aria-hidden>
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={spark.map((v, k) => `${(k / (spark.length - 1)) * 68 + 1},${24 - (v / max) * 22}`).join(" ")}
            />
          </svg>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
        {detalle && <span>{detalle}</span>}
        {variacion !== undefined && variacion !== null && (
          <span className={`font-semibold ${variacion >= 0 ? "text-success" : "text-danger"}`}>
            {variacion >= 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(0)}% vs. ayer
          </span>
        )}
      </div>
    </div>
  );
}
