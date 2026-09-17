"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { articleMatches } from "@/lib/search";
import { money } from "@/lib/format";
import { EMPRESAS } from "@/lib/empresas";
import type { Articulo } from "@/lib/articulos/types";
import type { Cliente } from "@/lib/clientes/types";

type Condicion = "efectivo" | "facturado" | "cta_cte";

interface DevolucionRow {
  id: string;
  cliente_nombre: string;
  condicion: string;
  es_cambio: boolean;
  articulo_dev_desc: string;
  cantidad_dev: number;
  diferencia: number;
  creado_en: string;
}

const FIELD =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function DevolucionesView({
  initialArticulos,
  initialClientes,
  initialDevoluciones,
}: {
  initialArticulos: Articulo[];
  initialClientes: Cliente[];
  initialDevoluciones: DevolucionRow[];
}) {
  const [articulos, setArticulos] = useState(initialArticulos);
  const [clientes] = useState(initialClientes);
  const [historial, setHistorial] = useState(initialDevoluciones);

  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [condicion, setCondicion] = useState<Condicion>("efectivo");
  const [empresaIdx, setEmpresaIdx] = useState(0);
  const [facturaNumero, setFacturaNumero] = useState("");
  const [facturasCliente, setFacturasCliente] = useState<{ numero: string; total: number }[]>([]);
  const [esCambio, setEsCambio] = useState(false);

  const [devTerm, setDevTerm] = useState("");
  const [devArt, setDevArt] = useState<Articulo | null>(null);
  const [devCantidad, setDevCantidad] = useState("1");

  const [nuevoTerm, setNuevoTerm] = useState("");
  const [nuevoArt, setNuevoArt] = useState<Articulo | null>(null);
  const [nuevoCantidad, setNuevoCantidad] = useState("1");

  const [buscarHist, setBuscarHist] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (condicion !== "facturado" || !selectedCliente) {
      setFacturasCliente([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from("ventas")
      .select("numero, total, doc_type")
      .eq("cliente_nombre", selectedCliente.razonSocial)
      .in("doc_type", ["factura_a", "factura_b", "factura_c"])
      .order("creado_en", { ascending: false })
      .limit(20)
      .then(({ data }) => setFacturasCliente((data ?? []).map((d) => ({ numero: d.numero as string, total: Number(d.total) }))));
  }, [condicion, selectedCliente]);

  const clienteSuggestions = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return [];
    return clientes.filter((c) => c.razonSocial.toLowerCase().includes(q)).slice(0, 6);
  }, [clienteSearch, clientes]);

  const devSuggestions = useMemo(() => {
    const q = devTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    return articulos.filter((a) => articleMatches(a, q)).slice(0, 5);
  }, [devTerm, articulos]);

  const nuevoSuggestions = useMemo(() => {
    const q = nuevoTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    return articulos.filter((a) => articleMatches(a, q)).slice(0, 5);
  }, [nuevoTerm, articulos]);

  const montoDevuelto = devArt ? devArt.precioMinorista * (Number(devCantidad) || 0) : 0;
  const montoNuevo = esCambio && nuevoArt ? nuevoArt.precioMinorista * (Number(nuevoCantidad) || 0) : 0;
  const diferencia = esCambio ? montoNuevo - montoDevuelto : -montoDevuelto;

  async function registrar() {
    setError("");
    setOk("");
    if (!devArt) return setError("Elegí el artículo devuelto.");
    if (esCambio && !nuevoArt) return setError("Elegí el artículo nuevo del cambio.");
    if (condicion === "facturado" && !facturaNumero) return setError("Elegí la factura correspondiente.");

    setSaving(true);
    const supabase = createClient();
    const clienteNombre = selectedCliente?.razonSocial ?? "Consumidor Final";
    const empresa = EMPRESAS[empresaIdx];

    try {
      // Stock: se devuelve el artículo entregado; si es cambio, se descuenta el nuevo.
      await supabase.rpc("devolver_stock", { p_articulo_id: devArt.id, p_cantidad: Number(devCantidad) || 0 });
      if (esCambio && nuevoArt) {
        await supabase.rpc("descontar_stock", { p_articulo_id: nuevoArt.id, p_cantidad: Number(nuevoCantidad) || 0 });
      }
      setArticulos((prev) =>
        prev.map((a) => {
          if (a.id === devArt.id) return { ...a, stock: a.stock + (Number(devCantidad) || 0) };
          if (esCambio && nuevoArt && a.id === nuevoArt.id) return { ...a, stock: a.stock - (Number(nuevoCantidad) || 0) };
          return a;
        }),
      );

      if (condicion === "efectivo") {
        await supabase.from("caja_ajustes").insert({
          monto: diferencia,
          motivo: `Devolución — ${clienteNombre} — ${devArt.descripcion}`,
        });
      } else if (condicion === "facturado") {
        const { data: n } = await supabase.rpc("next_comprobante_numero");
        const numero = `NC B ${empresa.puntoVenta}-${String(n).padStart(8, "0")}`;
        const cae = "7" + Math.floor(1000000000000 + Math.random() * 8999999999999).toString();
        await supabase.from("ventas").insert({
          numero,
          tipo: "Nota de Crédito B",
          doc_type: "nc_b",
          empresa_cuit: empresa.cuit,
          cliente_id: selectedCliente?.id ?? null,
          cliente_nombre: clienteNombre,
          condicion_pago: "nc",
          subtotal: montoDevuelto,
          descuento: 0,
          total: montoDevuelto,
          discrimina_iva: false,
          cae,
          nc_referencia_numero: facturaNumero,
        });
      } else if (condicion === "cta_cte" && selectedCliente) {
        await supabase.from("cta_cte_comprobantes").insert({
          cliente_id: selectedCliente.id,
          empresa_cuit: empresa.cuit,
          tipo: "Ajuste por devolución",
          numero: `DEV-${Date.now().toString().slice(-6)}`,
          total: diferencia,
        });
      }

      await supabase.from("devoluciones").insert({
        cliente_id: selectedCliente?.id ?? null,
        cliente_nombre: clienteNombre,
        condicion,
        empresa_cuit: condicion !== "efectivo" ? empresa.cuit : null,
        factura_numero: condicion === "facturado" ? facturaNumero : null,
        es_cambio: esCambio,
        articulo_dev_codigo: devArt.codigo,
        articulo_dev_desc: devArt.descripcion,
        cantidad_dev: Number(devCantidad) || 0,
        precio_dev: devArt.precioMinorista,
        articulo_nuevo_codigo: nuevoArt?.codigo ?? null,
        articulo_nuevo_desc: nuevoArt?.descripcion ?? null,
        cantidad_nueva: esCambio ? Number(nuevoCantidad) || 0 : null,
        precio_nuevo: nuevoArt?.precioMinorista ?? null,
        diferencia,
      });

      setHistorial((prev) => [
        {
          id: crypto.randomUUID(),
          cliente_nombre: clienteNombre,
          condicion,
          es_cambio: esCambio,
          articulo_dev_desc: devArt.descripcion,
          cantidad_dev: Number(devCantidad) || 0,
          diferencia,
          creado_en: new Date().toISOString(),
        },
        ...prev,
      ]);

      setOk("Devolución registrada correctamente.");
      setDevArt(null);
      setDevTerm("");
      setDevCantidad("1");
      setNuevoArt(null);
      setNuevoTerm("");
      setNuevoCantidad("1");
      setEsCambio(false);
    } catch {
      setError("No se pudo registrar la devolución.");
    }
    setSaving(false);
  }

  const historialFiltrado = historial.filter(
    (h) => !buscarHist || h.cliente_nombre.toLowerCase().includes(buscarHist.toLowerCase()),
  );

  return (
    <div className="grid grid-cols-[1.3fr_1fr] gap-5">
      <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <div className="mb-3 relative">
          <label className={LABEL}>Cliente</label>
          {selectedCliente ? (
            <div className="mt-1 flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm">
              <span>{selectedCliente.razonSocial}</span>
              <button onClick={() => setSelectedCliente(null)} className="text-xs font-medium text-danger">
                Quitar
              </button>
            </div>
          ) : (
            <>
              <input value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} placeholder="Nombre o razón social" className={`${FIELD} mt-1`} />
              {clienteSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                  {clienteSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCliente(c);
                        setClienteSearch("");
                      }}
                      className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                    >
                      {c.razonSocial}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-3">
          <label className={LABEL}>Condición de la venta original</label>
          <select value={condicion} onChange={(e) => setCondicion(e.target.value as Condicion)} className={`${FIELD} mt-1`}>
            <option value="efectivo">Efectivo (no facturado)</option>
            <option value="facturado">Facturado</option>
            <option value="cta_cte">Cuenta corriente</option>
          </select>
        </div>

        {condicion === "facturado" && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Factura a la que corresponde</label>
              <select value={facturaNumero} onChange={(e) => setFacturaNumero(e.target.value)} className={`${FIELD} mt-1`}>
                <option value="">Elegí una factura…</option>
                {facturasCliente.map((f) => (
                  <option key={f.numero} value={f.numero}>
                    {f.numero} — {money(f.total)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Empresa/CUIT que emite la NC</label>
              <select value={empresaIdx} onChange={(e) => setEmpresaIdx(Number(e.target.value))} className={`${FIELD} mt-1`}>
                {EMPRESAS.map((e, i) => (
                  <option key={e.cuit} value={i}>
                    {e.razonSocial}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {condicion === "cta_cte" && (
          <div className="mb-3">
            <label className={LABEL}>Empresa/CUIT</label>
            <select value={empresaIdx} onChange={(e) => setEmpresaIdx(Number(e.target.value))} className={`${FIELD} mt-1`}>
              {EMPRESAS.map((e, i) => (
                <option key={e.cuit} value={i}>
                  {e.razonSocial}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={esCambio} onChange={(e) => setEsCambio(e.target.checked)} />
          Es un cambio por otro producto
        </label>

        <div className="mb-3 rounded-lg border border-border p-3">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Artículo devuelto</p>
          <div className="relative">
            <input
              value={devTerm}
              onChange={(e) => {
                setDevTerm(e.target.value);
                setDevArt(null);
              }}
              placeholder="Código o descripción…"
              className={FIELD}
            />
            {devSuggestions.length > 0 && !devArt && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                {devSuggestions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setDevArt(a);
                      setDevTerm(`${a.codigo} — ${a.descripcion}`);
                    }}
                    className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                  >
                    {a.descripcion} <span className="text-xs text-ink-faint">stock: {a.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {devArt && (
            <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
              <span>
                {devArt.marca} · {money(devArt.precioMinorista)} c/u · stock actual {devArt.stock}
              </span>
              <label className="flex items-center gap-1.5 text-ink-soft">
                Cant.
                <input
                  type="number"
                  value={devCantidad}
                  onChange={(e) => setDevCantidad(e.target.value)}
                  className="w-16 rounded border border-border px-1.5 py-1 text-right font-mono"
                />
              </label>
            </div>
          )}
        </div>

        {esCambio && (
          <div className="mb-3 rounded-lg border border-border p-3">
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">Artículo nuevo (que se lleva)</p>
            <div className="relative">
              <input
                value={nuevoTerm}
                onChange={(e) => {
                  setNuevoTerm(e.target.value);
                  setNuevoArt(null);
                }}
                placeholder="Código o descripción…"
                className={FIELD}
              />
              {nuevoSuggestions.length > 0 && !nuevoArt && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                  {nuevoSuggestions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setNuevoArt(a);
                        setNuevoTerm(`${a.codigo} — ${a.descripcion}`);
                      }}
                      className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                    >
                      {a.descripcion} <span className="text-xs text-ink-faint">stock: {a.stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {nuevoArt && (
              <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                <span>
                  {nuevoArt.marca} · {money(nuevoArt.precioMinorista)} c/u
                </span>
                <label className="flex items-center gap-1.5 text-ink-soft">
                  Cant.
                  <input
                    type="number"
                    value={nuevoCantidad}
                    onChange={(e) => setNuevoCantidad(e.target.value)}
                    className="w-16 rounded border border-border px-1.5 py-1 text-right font-mono"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {error && <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        {ok && <p className="mb-3 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">{ok}</p>}

        <button
          onClick={registrar}
          disabled={saving}
          className="w-full rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
        >
          {saving ? "Registrando…" : "Registrar devolución"}
        </button>
      </div>

      <div>
        <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-ink">Resumen</p>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-ink-soft">Se devuelve</span>
            <span className="font-mono">{money(montoDevuelto)}</span>
          </div>
          {esCambio && (
            <div className="flex justify-between border-b border-border py-1.5 text-sm">
              <span className="text-ink-soft">Artículo nuevo</span>
              <span className="font-mono">{money(montoNuevo)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 text-base font-bold">
            <span>{diferencia > 0 ? "Cliente paga la diferencia" : "A favor del cliente"}</span>
            <span className="font-mono">{money(Math.abs(diferencia))}</span>
          </div>
        </div>

        <input
          value={buscarHist}
          onChange={(e) => setBuscarHist(e.target.value)}
          placeholder="Buscar devoluciones por cliente…"
          className={`${FIELD} mb-2`}
        />
        <div className="flex flex-col gap-1.5">
          {historialFiltrado.map((h) => (
            <div key={h.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="font-medium text-ink">
                {h.cliente_nombre} — {h.articulo_dev_desc}
              </p>
              <p className="text-xs text-ink-faint">
                {new Date(h.creado_en).toLocaleDateString("es-AR")} · {h.condicion} · {h.es_cambio ? "Cambio" : "Devolución"} ·{" "}
                {money(Math.abs(h.diferencia))}
              </p>
            </div>
          ))}
          {historialFiltrado.length === 0 && <p className="text-sm text-ink-faint">Sin devoluciones cargadas.</p>}
        </div>
      </div>
    </div>
  );
}
