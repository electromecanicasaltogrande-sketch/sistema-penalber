"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { diasHasta, type Cheque } from "@/lib/cheques/types";
import { EMPRESAS } from "@/lib/empresas";

export interface VentaDash {
  creado_en: string;
  total: number;
  doc_type: string;
  condicion_pago: string;
  cliente_nombre: string;
  empresa_cuit: string;
}

export interface FacturaPendienteDash {
  proveedor: string;
  total: number;
  fecha: string;
}

const FORMAS = [
  { id: "efectivo", label: "Efectivo", color: "#2f8f5b" },
  { id: "transferencia", label: "Transferencia", color: "#be6a2e" },
  { id: "tarjeta", label: "Tarjeta", color: "#5b6472" },
  { id: "cheque", label: "Cheque / eCheq", color: "#c98a2a" },
  { id: "cta_cte", label: "Cuenta corriente", color: "#4a78a8" },
] as const;

const fmtDia = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
const diaAr = (d: Date | string) => fmtDia.format(typeof d === "string" ? new Date(d) : d);

function corto(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3).toLocaleString("es-AR")} k`;
  return `$${Math.round(n)}`;
}

function formaDe(v: VentaDash): string | null {
  if (v.doc_type.startsWith("nc_") || v.condicion_pago === "nc") return null;
  if (v.condicion_pago === "echeq") return "cheque";
  return FORMAS.some((f) => f.id === v.condicion_pago) ? v.condicion_pago : "efectivo";
}

const neto = (v: VentaDash) => (v.doc_type.startsWith("nc_") ? -Number(v.total) : Number(v.total));

export default function DashboardView({
  ventas,
  cheques,
  facturasProveedores,
}: {
  ventas: VentaDash[];
  cheques: Cheque[];
  facturasProveedores: FacturaPendienteDash[];
}) {
  const [rango, setRango] = useState<7 | 14 | 30>(14);
  const [hover, setHover] = useState<number | null>(null);

  const datos = useMemo(() => {
    const porDia = new Map<string, { total: number; n: number; facturado: number; formas: Record<string, number> }>();
    for (const v of ventas) {
      const k = diaAr(v.creado_en);
      const d = porDia.get(k) ?? { total: 0, n: 0, facturado: 0, formas: {} };
      d.total += neto(v);
      d.n += 1;
      if (v.doc_type.startsWith("factura")) d.facturado += Number(v.total);
      const f = formaDe(v);
      if (f) d.formas[f] = (d.formas[f] ?? 0) + Number(v.total);
      porDia.set(k, d);
    }
    return porDia;
  }, [ventas]);

  const hoy = diaAr(new Date());
  const diasAtras = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return diaAr(d);
  };

  const dHoy = datos.get(hoy);
  const dAyer = datos.get(diasAtras(1));
  const totalHoy = dHoy?.total ?? 0;
  const delta = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

  const sumaDias = (desdeAtras: number, hastaAtras: number) => {
    let s = 0;
    for (let i = hastaAtras; i <= desdeAtras; i++) s += datos.get(diasAtras(i))?.total ?? 0;
    return s;
  };
  const ult30 = sumaDias(29, 0);
  const prev30 = sumaDias(59, 30);

  const spark = useMemo(
    () => Array.from({ length: 7 }, (_, i) => datos.get(diasAtras(6 - i))?.total ?? 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos],
  );

  const dias = useMemo(() => {
    return Array.from({ length: rango }, (_, i) => {
      const key = diasAtras(rango - 1 - i);
      const d = datos.get(key);
      const fecha = new Date(key + "T12:00:00");
      return {
        key,
        label: rango <= 7 ? fecha.toLocaleDateString("es-AR", { weekday: "short" }) : fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
        total: d?.total ?? 0,
        n: d?.n ?? 0,
        formas: d?.formas ?? {},
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, rango]);

  const maxDia = Math.max(1, ...dias.map((d) => Object.values(d.formas).reduce((s, x) => s + x, 0)));

  const enRango = useMemo(() => {
    const desde = diasAtras(rango - 1);
    return ventas.filter((v) => diaAr(v.creado_en) >= desde);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas, rango]);

  const porForma = useMemo(() => {
    const o: Record<string, number> = {};
    for (const v of enRango) {
      const f = formaDe(v);
      if (f) o[f] = (o[f] ?? 0) + Number(v.total);
    }
    return o;
  }, [enRango]);
  const totalFormas = Object.values(porForma).reduce((s, x) => s + x, 0);

  const topClientes = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of enRango) {
      if (v.cliente_nombre === "Consumidor Final" || v.doc_type.startsWith("nc_")) continue;
      m.set(v.cliente_nombre, (m.get(v.cliente_nombre) ?? 0) + Number(v.total));
    }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [enRango]);

  const porEmpresa = EMPRESAS.map((e) => ({
    nombre: e.razonSocial,
    total: enRango.filter((v) => v.empresa_cuit === e.cuit).reduce((s, v) => s + neto(v), 0),
  }));

  const chequesOrdenados = [...cheques].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const chequesProximos = chequesOrdenados.slice(0, 6);
  const totalCheques = cheques.reduce((s, c) => s + c.importe, 0);

  const totalProv = facturasProveedores.reduce((s, f) => s + f.total, 0);
  const topProv = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of facturasProveedores) m.set(f.proveedor, (m.get(f.proveedor) ?? 0) + f.total);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [facturasProveedores]);

  const dHover = hover !== null ? dias[hover] : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Ventas de hoy"
          valor={money(totalHoy)}
          detalle={`${dHoy?.n ?? 0} comprobante${(dHoy?.n ?? 0) === 1 ? "" : "s"}`}
          delta={delta(totalHoy, dAyer?.total ?? 0)}
          deltaTxt="vs. ayer"
          color="#be6a2e"
          spark={spark}
        />
        <Kpi
          titulo="Cobrado en efectivo hoy"
          valor={money(dHoy?.formas.efectivo ?? 0)}
          detalle="Caja contado"
          color="#2f8f5b"
        />
        <Kpi
          titulo="Facturado hoy"
          valor={money(dHoy?.facturado ?? 0)}
          detalle="Facturas A / B / C"
          color="#4a78a8"
        />
        <Kpi
          titulo="Últimos 30 días"
          valor={money(ult30)}
          detalle={`Anteriores 30: ${corto(prev30)}`}
          delta={delta(ult30, prev30)}
          deltaTxt="vs. 30 días previos"
          color="#1b2028"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Ventas por día</h2>
              <p className="text-xs text-ink-faint">Según cómo se cobró · pasá el mouse por una barra</p>
            </div>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRango(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    rango === r ? "border-copper bg-copper text-white" : "border-border text-ink-soft hover:bg-bg"
                  }`}
                >
                  {r} días
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-2 h-56 pl-12">
            {[0, 25, 50, 75, 100].map((p) => (
              <div key={p} className="pointer-events-none absolute left-0 right-0" style={{ bottom: `calc(${p}% * 0.88 + 22px)` }}>
                <span className="absolute -top-2 left-0 w-10 text-right text-[10px] text-ink-faint">{corto((maxDia * p) / 100)}</span>
                <div className="ml-12 border-t border-dashed border-border" />
              </div>
            ))}
            <div className="relative flex h-full items-end gap-1 pb-[22px]">
              {dias.map((d, i) => {
                const suma = Object.values(d.formas).reduce((s, x) => s + x, 0);
                return (
                  <div
                    key={d.key}
                    className="relative flex h-full flex-1 flex-col items-center justify-end"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div className="flex w-full max-w-[34px] flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(suma / maxDia) * 88}%` }}>
                      {FORMAS.map((f) => (
                        <div key={f.id} style={{ height: suma ? `${((d.formas[f.id] ?? 0) / suma) * 100}%` : 0, background: f.color }} />
                      ))}
                    </div>
                    <span className="absolute top-full mt-1 text-[10px] capitalize text-ink-faint">
                      {rango === 30 && i % 2 === 1 ? "" : d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {dHover && (
              <div className="pointer-events-none absolute right-2 top-0 z-10 w-52 rounded-lg border border-border bg-surface p-2.5 text-xs shadow-lg">
                <p className="mb-1 font-semibold capitalize text-ink">
                  {new Date(dHover.key + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {FORMAS.filter((f) => dHover.formas[f.id]).map((f) => (
                  <p key={f.id} className="flex items-center justify-between gap-2 text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: f.color }} />
                      {f.label}
                    </span>
                    <span className="font-mono">{money(dHover.formas[f.id])}</span>
                  </p>
                ))}
                <p className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-ink">
                  <span>{dHover.n} comp.</span>
                  <span className="font-mono">{money(dHover.total)}</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            {FORMAS.map((f) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
                {f.label}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {porEmpresa.map((e) => (
              <div key={e.nombre} className="rounded-lg bg-bg px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{e.nombre}</p>
                <p className="font-mono text-base font-bold text-ink">{money(e.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Cómo se cobra</h2>
          <p className="mb-3 text-xs text-ink-faint">Últimos {rango} días</p>
          <div className="relative mx-auto h-44 w-44">
            <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f4f3ef" strokeWidth="6" />
              {(() => {
                let acum = 0;
                return FORMAS.map((f) => {
                  const pct = totalFormas ? ((porForma[f.id] ?? 0) / totalFormas) * 100 : 0;
                  const el = (
                    <circle
                      key={f.id}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="none"
                      stroke={f.color}
                      strokeWidth="6"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={-acum}
                    />
                  );
                  acum += pct;
                  return el;
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase tracking-wide text-ink-faint">Total</span>
              <span className="font-mono text-lg font-bold text-ink">{corto(totalFormas)}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            {FORMAS.map((f) => {
              const v = porForma[f.id] ?? 0;
              const pct = totalFormas ? (v / totalFormas) * 100 : 0;
              return (
                <div key={f.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
                    {f.label}
                  </span>
                  <span className="font-mono text-ink">
                    {corto(v)} <span className="text-ink-faint">· {pct.toFixed(0)}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Mejores clientes</h2>
          <p className="mb-3 text-xs text-ink-faint">Últimos {rango} días</p>
          {topClientes.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin ventas a clientes en este período.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topClientes.map(([nombre, total]) => (
                <div key={nombre}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="truncate pr-2 text-ink">{nombre}</span>
                    <span className="font-mono text-ink-soft">{corto(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-copper" style={{ width: `${(total / topClientes[0][1]) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Cheques por cobrar</h2>
              <p className="text-xs text-ink-faint">{cheques.length} pendiente{cheques.length === 1 ? "" : "s"}</p>
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
                  <Link key={c.id} href="/cheques" className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-bg">
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
        </section>

        <section className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">A pagar a proveedores</h2>
              <p className="text-xs text-ink-faint">
                {facturasProveedores.length} factura{facturasProveedores.length === 1 ? "" : "s"} pendiente{facturasProveedores.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-ink">{corto(totalProv)}</span>
          </div>
          {topProv.length === 0 ? (
            <p className="text-sm text-ink-faint">No hay facturas pendientes de pago.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topProv.map(([nombre, total]) => (
                <div key={nombre}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="truncate pr-2 text-ink">{nombre}</span>
                    <span className="font-mono text-ink-soft">{corto(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${(total / topProv[0][1]) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/proveedores" className="mt-3 block text-xs font-semibold text-copper hover:underline">
            Ver facturas de proveedores →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  detalle,
  delta,
  deltaTxt,
  color,
  spark,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  delta?: number | null;
  deltaTxt?: string;
  color: string;
  spark?: number[];
}) {
  const max = Math.max(1, ...(spark ?? [1]));
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-app)] border border-border bg-surface p-4">
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
              points={spark.map((v, i) => `${(i / (spark.length - 1)) * 68 + 1},${24 - (v / max) * 22}`).join(" ")}
            />
          </svg>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
        {detalle && <span>{detalle}</span>}
        {delta !== undefined && delta !== null && (
          <span className={`font-semibold ${delta >= 0 ? "text-success" : "text-danger"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% {deltaTxt}
          </span>
        )}
      </div>
    </div>
  );
}
