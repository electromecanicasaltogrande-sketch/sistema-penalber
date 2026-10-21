"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { EMPRESAS, empresaCorta } from "@/lib/empresas";
import {
  comprobanteFromRow,
  deudaCliente,
  estaPagado,
  saldo,
  type Cliente,
  type CtaCteComprobante,
  type CtaCteComprobanteRow,
} from "@/lib/clientes/types";
import { distribuirPago } from "@/lib/clientes/payment";
import { DOC_LABELS } from "@/lib/ventas/types";
import ReciboPago, { type ReciboData } from "./ReciboPago";
import DetalleCuentaPrint, { type DetalleCuentaData } from "./DetalleCuentaPrint";

type Tab = "deuda" | "pago" | "datos";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function ClienteFicha({
  cliente,
  onDeleted,
  onUpdated,
}: {
  cliente: Cliente;
  onDeleted: (id: string) => void;
  onUpdated: (c: Cliente) => void;
}) {
  const [tab, setTab] = useState<Tab>("deuda");
  const [comps, setComps] = useState<CtaCteComprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [descuento10, setDescuento10] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [recibo, setRecibo] = useState<ReciboData | null>(null);
  const [seleccionDetalle, setSeleccionDetalle] = useState<Set<string>>(new Set());
  const [detalleCuenta, setDetalleCuenta] = useState<DetalleCuentaData | null>(null);
  const [error, setError] = useState("");
  const [mostrarPagados, setMostrarPagados] = useState(false);
  const [pagosHist, setPagosHist] = useState<{ id: string; monto: number; forma_pago: string; fecha: string }[]>([]);

  // Datos tab
  const [razonSocial, setRazonSocial] = useState(cliente.razonSocial);
  const [cuit, setCuit] = useState(cliente.cuit);
  const [telefono, setTelefono] = useState(cliente.telefono);
  const [direccion, setDireccion] = useState(cliente.direccion);
  const [localidad, setLocalidad] = useState(cliente.localidad);
  const [tipoComprobanteDefault, setTipoComprobanteDefault] = useState(cliente.tipoComprobanteDefault ?? "");
  const [savingDatos, setSavingDatos] = useState(false);

  useEffect(() => {
    setRazonSocial(cliente.razonSocial);
    setCuit(cliente.cuit);
    setTelefono(cliente.telefono);
    setDireccion(cliente.direccion);
    setLocalidad(cliente.localidad);
    setTipoComprobanteDefault(cliente.tipoComprobanteDefault ?? "");
    setSeleccionadas([]);
    setSeleccionDetalle(new Set());
    setTab("deuda");
  }, [cliente.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("cta_cte_comprobantes")
      .select("id, cliente_id, empresa_cuit, tipo, numero, fecha, total, monto_pagado")
      .eq("cliente_id", cliente.id)
      .then(({ data }) => {
        if (!active) return;
        setComps(((data as CtaCteComprobanteRow[]) ?? []).map(comprobanteFromRow));
        setLoading(false);
      });

    const channel = supabase
      .channel(`cta-cte-${cliente.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cta_cte_comprobantes", filter: `cliente_id=eq.${cliente.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setComps((prev) => prev.filter((c) => c.id !== (payload.old as CtaCteComprobanteRow).id));
            return;
          }
          const row = comprobanteFromRow(payload.new as CtaCteComprobanteRow);
          setComps((prev) => {
            const exists = prev.some((c) => c.id === row.id);
            return exists ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [cliente.id]);

  async function cargarPagos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("cta_cte_pagos")
      .select("id, monto, forma_pago, fecha")
      .eq("cliente_id", cliente.id)
      .order("fecha", { ascending: false })
      .limit(500);
    setPagosHist(
      ((data ?? []) as { id: string; monto: number | string; forma_pago: string; fecha: string }[]).map((p) => ({
        ...p,
        monto: Number(p.monto),
      })),
    );
  }

  useEffect(() => {
    cargarPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const opcionesEmpresa = useMemo(
    () => [
      { cuit: "", label: "Todas", saldo: comps.filter((c) => !estaPagado(c)).reduce((s, c) => s + saldo(c), 0) },
      ...EMPRESAS.map((e) => ({
        cuit: e.cuit,
        label: e.razonSocial,
        saldo: comps.filter((c) => c.empresaCuit === e.cuit && !estaPagado(c)).reduce((s, c) => s + saldo(c), 0),
      })),
    ],
    [comps],
  );

  const filtrados = useMemo(() => {
    return comps.filter((cp) => {
      if (empresaFiltro && cp.empresaCuit !== empresaFiltro) return false;
      if (desde && cp.fecha < desde) return false;
      if (hasta && cp.fecha > hasta) return false;
      return true;
    });
  }, [comps, empresaFiltro, desde, hasta]);

  const pendientes = filtrados.filter((cp) => !estaPagado(cp));
  const pagados = filtrados.filter((cp) => estaPagado(cp));
  const masRecientesPrimero = (a: CtaCteComprobante, b: CtaCteComprobante) =>
    b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero);
  const visibles = [...(mostrarPagados ? filtrados : pendientes)].sort(masRecientesPrimero);
  const pendientesOrdenados = [...pendientes].sort(masRecientesPrimero);
  const saldoPendiente = pendientes.reduce((s, cp) => s + saldo(cp), 0);
  const saldoPagado = pagados.reduce((s, cp) => s + cp.total, 0);
  const seleccionTotal = pendientes
    .filter((cp) => seleccionadas.includes(cp.id))
    .reduce((s, cp) => s + saldo(cp), 0);

  const deudaTotal = deudaCliente(comps);

  async function persistirAplicaciones(
    pagoMonto: number,
    aplicaciones: { comprobante: CtaCteComprobante; montoAplicado: number }[],
  ) {
    const supabase = createClient();
    const { data: pago, error: pagoErr } = await supabase
      .from("cta_cte_pagos")
      .insert({
        cliente_id: cliente.id,
        monto: pagoMonto,
        forma_pago: formaPago,
        descuento_10: descuento10,
      })
      .select("id")
      .single();
    if (pagoErr || !pago) throw pagoErr;

    for (const ap of aplicaciones) {
      await supabase
        .from("cta_cte_comprobantes")
        .update({ monto_pagado: ap.comprobante.montoPagado })
        .eq("id", ap.comprobante.id);
      await supabase.from("cta_cte_pago_aplicaciones").insert({
        pago_id: pago.id,
        comprobante_id: ap.comprobante.id,
        monto: ap.montoAplicado,
      });
    }

    setComps((prev) =>
      prev.map((c) => {
        const ap = aplicaciones.find((a) => a.comprobante.id === c.id);
        return ap ? ap.comprobante : c;
      }),
    );
    cargarPagos();
  }

  async function marcarSeleccionadasPagas() {
    setError("");
    if (seleccionadas.length === 0) return setError("Tildá al menos un comprobante.");
    const targets = pendientes.filter((cp) => seleccionadas.includes(cp.id));
    const aplicaciones = targets.map((cp) => ({
      comprobante: { ...cp, montoPagado: cp.total },
      montoAplicado: descuento10 ? saldo(cp) * 0.9 : saldo(cp),
    }));
    const totalCobrado = aplicaciones.reduce((s, a) => s + a.montoAplicado, 0);
    try {
      await persistirAplicaciones(totalCobrado, aplicaciones);
    } catch {
      return setError("No se pudo registrar el pago.");
    }
    setSeleccionadas([]);
    setDescuento10(false);
    const nuevaDeuda = deudaCliente(
      comps.map((c) => {
        const ap = aplicaciones.find((a) => a.comprobante.id === c.id);
        return ap ? ap.comprobante : c;
      }),
    );
    setRecibo({
      titulo: "RECIBO DE PAGO",
      numero: `REC-${Date.now().toString().slice(-6)}`,
      cliente: cliente.razonSocial,
      fecha: new Date().toLocaleDateString("es-AR"),
      lineas: targets.map((cp, i) => ({
        comprobante: `${cp.tipo} — ${cp.numero}`,
        detalle: descuento10 ? "10% off" : "",
        monto: aplicaciones[i].montoAplicado,
      })),
      totalAplicado: totalCobrado,
      saldoRestante: nuevaDeuda,
    });
  }

  async function registrarPagoParcial() {
    setError("");
    const monto = parseFloat(montoPago) || 0;
    if (monto <= 0) return setError("Ingresá un importe válido.");
    const objetivos =
      seleccionadas.length > 0
        ? pendientes.filter((cp) => seleccionadas.includes(cp.id))
        : pendientes;
    const { aplicaciones, aplicado, sobrante } = distribuirPago(monto, objetivos, descuento10);
    if (aplicaciones.length === 0) {
      return setError("No hay comprobantes pendientes para aplicar el pago.");
    }
    try {
      await persistirAplicaciones(aplicado, aplicaciones);
    } catch {
      return setError("No se pudo registrar el pago.");
    }
    setMontoPago("");
    setSeleccionadas([]);
    setDescuento10(false);
    const nuevaDeuda = deudaCliente(
      comps.map((c) => {
        const ap = aplicaciones.find((a) => a.comprobante.id === c.id);
        return ap ? ap.comprobante : c;
      }),
    );
    setRecibo({
      titulo: "RECIBO DE PAGO / ADELANTO",
      numero: `REC-${Date.now().toString().slice(-6)}`,
      cliente: cliente.razonSocial,
      fecha: new Date().toLocaleDateString("es-AR"),
      lineas: aplicaciones.map((a) => ({
        comprobante: `${a.comprobante.tipo} — ${a.comprobante.numero}`,
        detalle: `Saldo restante ${money(a.saldoRestante)}`,
        monto: a.montoAplicado,
      })),
      totalAplicado: aplicado,
      saldoRestante: nuevaDeuda,
    });
    if (sobrante > 0.5) {
      setError(`Sobraron ${money(sobrante)} sin asignar (no había más deuda pendiente).`);
    }
  }

  async function guardarDatos() {
    setSavingDatos(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("clientes")
      .update({
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        localidad: localidad.trim(),
        tipo_comprobante_default: tipoComprobanteDefault || null,
      })
      .eq("id", cliente.id);
    setSavingDatos(false);
    if (err) return setError(err.message);
    onUpdated({
      ...cliente,
      razonSocial,
      cuit,
      telefono,
      direccion,
      localidad,
      tipoComprobanteDefault: tipoComprobanteDefault || null,
    });
  }

  async function eliminarCliente() {
    if (cliente.esConsumidorFinal) {
      return setError("Consumidor Final no se puede eliminar.");
    }
    if (deudaTotal > 0) {
      return setError("No se puede eliminar: el cliente tiene deuda pendiente.");
    }
    const supabase = createClient();
    const { error: err } = await supabase.from("clientes").delete().eq("id", cliente.id);
    if (err) return setError("No se pudo eliminar el cliente.");
    onDeleted(cliente.id);
  }

  return (
    <div className="rounded-[var(--radius-app)] border border-border bg-surface p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          {cliente.razonSocial}
        </h2>
        <p className="text-xs text-ink-faint">{cliente.cuit || "Sin CUIT cargado"}</p>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-ink-soft">Ver cuenta corriente de la razón social</p>
        <div className="flex flex-wrap gap-2">
          {opcionesEmpresa.map((o) => (
            <button
              key={o.cuit || "todas"}
              onClick={() => {
                setEmpresaFiltro(o.cuit);
                setSeleccionadas([]);
                setSeleccionDetalle(new Set());
              }}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                empresaFiltro === o.cuit
                  ? "border-copper bg-copper-soft text-ink"
                  : "border-border bg-bg text-ink-soft hover:bg-surface"
              }`}
            >
              <span className="block font-semibold">{o.label}</span>
              <span className={`font-mono ${o.saldo > 0 ? "text-danger" : "text-ink-faint"}`}>
                Debe {money(o.saldo)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
      <div className="mt-4 flex gap-1 border-b border-border">
        {(
          [
            ["deuda", "Deuda"],
            ["pago", "Cargar pago"],
            ["datos", "Datos"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium ${
              tab === id ? "border-copper text-ink" : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {(tab === "deuda" || tab === "pago") && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-ink-soft"
          />
          <span className="text-xs text-ink-faint">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-ink-soft"
          />
        </div>
      )}

      {tab === "deuda" && (
        <div className="mt-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-danger-soft px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-danger">Saldo pendiente</p>
              <p className="mt-1 font-mono text-lg font-bold text-danger">{money(saldoPendiente)}</p>
            </div>
            <div className="rounded-lg bg-success-soft px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-success">Ya pagado</p>
              <p className="mt-1 font-mono text-lg font-bold text-success">{money(saldoPagado)}</p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-ink-faint">Cargando…</p>
          ) : visibles.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-faint">
              {mostrarPagados ? "Sin comprobantes para este filtro." : "No tiene comprobantes pendientes en este filtro."}
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input type="checkbox" checked={mostrarPagados} onChange={(e) => setMostrarPagados(e.target.checked)} />
                  Mostrar también los ya pagados
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={visibles.length > 0 && visibles.every((cp) => seleccionDetalle.has(cp.id))}
                    onChange={(e) =>
                      setSeleccionDetalle(e.target.checked ? new Set(visibles.map((cp) => cp.id)) : new Set())
                    }
                  />
                  Seleccionar todos
                </label>
                </div>
                <button
                  onClick={() =>
                    setDetalleCuenta({
                      clienteNombre: cliente.razonSocial,
                      clienteCuit: cliente.cuit,
                      comprobantes:
                        seleccionDetalle.size > 0
                          ? visibles.filter((cp) => seleccionDetalle.has(cp.id))
                          : visibles,
                      fecha: new Date().toLocaleDateString("es-AR"),
                    })
                  }
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  📄 Generar detalle de cuenta{seleccionDetalle.size > 0 ? ` (${seleccionDetalle.size})` : ""}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {visibles.map((cp) => {
                  const s = saldo(cp);
                  const pagado = estaPagado(cp);
                  const parcial = !pagado && cp.montoPagado > 0;
                  return (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={seleccionDetalle.has(cp.id)}
                          onChange={(e) =>
                            setSeleccionDetalle((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(cp.id);
                              else next.delete(cp.id);
                              return next;
                            })
                          }
                        />
                        <div>
                          <p className="font-medium text-ink">
                            {cp.tipo} — {cp.numero}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {cp.fecha} · {empresaCorta(cp.empresaCuit)}
                            {parcial ? ` · abonado ${money(cp.montoPagado)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">
                          {pagado ? money(cp.total) : `${money(s)} de ${money(cp.total)}`}
                        </p>
                        <span
                          className={`text-[11px] font-semibold ${
                            pagado ? "text-success" : parcial ? "text-warning" : "text-danger"
                          }`}
                        >
                          {pagado ? "Pagado" : parcial ? "Parcial" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-6">
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">
              Pagos y notas de crédito registrados ({pagosHist.length})
            </p>
            {pagosHist.length === 0 ? (
              <p className="py-3 text-center text-xs text-ink-faint">Todavía no hay pagos registrados.</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {pagosHist.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    <span className="text-xs text-ink-soft">
                      {p.fecha} · {p.forma_pago}
                    </span>
                    <span className="font-mono font-semibold text-success">{money(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "pago" && (
        <div className="mt-4">
          {pendientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-faint">
              No tiene comprobantes pendientes en este filtro 🎉
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pendientesOrdenados.map((cp) => {
                const s = saldo(cp);
                return (
                  <label
                    key={cp.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={seleccionadas.includes(cp.id)}
                        onChange={(e) =>
                          setSeleccionadas((prev) =>
                            e.target.checked ? [...prev, cp.id] : prev.filter((x) => x !== cp.id),
                          )
                        }
                      />
                      <div>
                        <p className="font-medium text-ink">
                          {cp.tipo} — {cp.numero}
                        </p>
                        <p className="text-xs text-ink-faint">
                          {cp.fecha} · {empresaCorta(cp.empresaCuit)}
                          {cp.montoPagado > 0 ? ` · saldo ${money(s)}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-semibold">{money(s)}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm">
            <span className="text-ink-soft">Total seleccionado</span>
            <span className="font-mono font-semibold">{money(seleccionTotal)}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-ink-soft"
            >
              {["Efectivo", "Transferencia", "Tarjeta", "Cheque", "eCheq"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={descuento10}
                onChange={(e) => setDescuento10(e.target.checked)}
              />
              Aplicar 10% off
            </label>
          </div>

          <button
            onClick={marcarSeleccionadasPagas}
            disabled={pendientes.length === 0}
            className="mt-3 w-full rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
          >
            Marcar seleccionadas como pagas por completo
          </button>

          <div className="mt-5 rounded-lg border border-border p-3.5">
            <p className={`${LABEL} mb-2`}>Registrar pago / adelanto</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="Importe entregado"
                className={FIELD}
              />
              <button
                onClick={registrarPagoParcial}
                disabled={pendientes.length === 0}
                className="whitespace-nowrap rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Registrar pago
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Si no seleccionás comprobantes, se reparte entre los pendientes más viejos primero.
            </p>
          </div>
        </div>
      )}

      {tab === "datos" && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Razón social</label>
            <input className={FIELD} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>CUIT / CUIL</label>
            <input className={FIELD} value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Teléfono</label>
            <input className={FIELD} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Dirección</label>
            <input className={FIELD} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Localidad</label>
            <input className={FIELD} value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Tipo de comprobante que se le hace habitualmente</label>
            <select
              className={FIELD}
              value={tipoComprobanteDefault}
              onChange={(e) => setTipoComprobanteDefault(e.target.value)}
            >
              <option value="">Sin definir</option>
              {Object.entries(DOC_LABELS)
                .filter(([k]) => !k.startsWith("nc_"))
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nombre}
                  </option>
                ))}
            </select>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Se preselecciona solo al elegir este cliente en Ventas — siempre se puede cambiar ahí.
            </p>
          </div>

          <button
            onClick={guardarDatos}
            disabled={savingDatos}
            className="mt-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
          >
            {savingDatos ? "Guardando…" : "Guardar cambios"}
          </button>

          {!cliente.esConsumidorFinal && (
            <button
              onClick={eliminarCliente}
              className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              Eliminar cliente
            </button>
          )}
        </div>
      )}
      </div>

      {recibo && <ReciboPago recibo={recibo} onClose={() => setRecibo(null)} />}
      {detalleCuenta && <DetalleCuentaPrint doc={detalleCuenta} onClose={() => setDetalleCuenta(null)} />}
    </div>
  );
}
