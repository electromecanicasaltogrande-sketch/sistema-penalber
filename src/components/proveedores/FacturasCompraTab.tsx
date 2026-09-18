"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarArticulosPorCodigos } from "@/lib/articulos/search";
import { useBuscadorArticulos } from "@/lib/articulos/useBuscadorArticulos";
import { money } from "@/lib/format";
import { EMPRESAS } from "@/lib/empresas";
import {
  facturaFromRow,
  totalFactura,
  type FacturaCompra,
  type FacturaCompraRow,
  type Proveedor,
} from "@/lib/proveedores/types";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function FacturasCompraTab({
  proveedores,
  facturas,
  onProveedorCreado,
  onFacturaCreada,
}: {
  proveedores: Proveedor[];
  facturas: FacturaCompra[];
  onProveedorCreado: (p: Proveedor) => void;
  onFacturaCreada: (f: FacturaCompra) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);

  const [tipoComprobante, setTipoComprobante] = useState("Factura A");
  const [empresaIdx, setEmpresaIdx] = useState(0);
  const [puntoVenta, setPuntoVenta] = useState("");
  const [numero, setNumero] = useState("");
  const [fechaLlegada, setFechaLlegada] = useState("");
  const [fechaFactura, setFechaFactura] = useState(() => new Date().toISOString().slice(0, 10));
  const [neto, setNeto] = useState("");
  const [iva, setIva] = useState("");
  const [otros, setOtros] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recepcion, setRecepcion] = useState<{ facturaId: string } | null>(null);

  const refs = {
    pv: useRef<HTMLInputElement>(null),
    numero: useRef<HTMLInputElement>(null),
    llegada: useRef<HTMLInputElement>(null),
    fecha: useRef<HTMLInputElement>(null),
    neto: useRef<HTMLInputElement>(null),
    iva: useRef<HTMLInputElement>(null),
    otros: useRef<HTMLInputElement>(null),
  };

  function nextOnEnter(ref: React.RefObject<HTMLInputElement | null>) {
    return (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
  }

  const facturasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (!q) return facturas;
    return facturas.filter((f) => {
      const p = proveedores.find((pr) => pr.id === f.proveedorId);
      return p?.razonSocial.toLowerCase().includes(q);
    });
  }, [facturas, proveedores, busqueda]);

  async function guardarFactura() {
    setError("");
    if (!proveedorId) return setError("Elegí un proveedor.");
    if (!numero.trim()) return setError("Ingresá el número de factura.");
    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("facturas_compra")
      .insert({
        proveedor_id: proveedorId,
        tipo_comprobante: tipoComprobante,
        empresa_cuit: EMPRESAS[empresaIdx].cuit,
        punto_venta: puntoVenta,
        numero: numero.trim(),
        fecha_llegada: fechaLlegada || null,
        fecha_factura: fechaFactura,
        neto: Number(neto) || 0,
        iva: Number(iva) || 0,
        otros_impuestos: Number(otros) || 0,
      })
      .select(
        "id, proveedor_id, tipo_comprobante, empresa_cuit, punto_venta, numero, fecha_llegada, fecha_factura, neto, iva, otros_impuestos, pagada",
      )
      .single();
    setSaving(false);
    if (err || !data) return setError("No se pudo guardar la factura.");
    const nueva = facturaFromRow(data as FacturaCompraRow);
    onFacturaCreada(nueva);
    setNumero("");
    setPuntoVenta("");
    setNeto("");
    setIva("");
    setOtros("");
    setRecepcion({ facturaId: nueva.id });
  }

  const proveedorSuggestions = useMemo(() => {
    const q = proveedorSearch.trim().toLowerCase();
    if (!q) return [];
    return proveedores.filter((p) => p.razonSocial.toLowerCase().includes(q)).slice(0, 6);
  }, [proveedorSearch, proveedores]);

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
      <div>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por proveedor…"
          className={`${FIELD} mb-3 max-w-sm`}
        />
        <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">N°</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-none">
                  <td className="px-3 py-2.5">{f.fechaFactura}</td>
                  <td className="px-3 py-2.5">
                    {proveedores.find((p) => p.id === f.proveedorId)?.razonSocial ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{f.tipoComprobante}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{f.numero}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{money(totalFactura(f))}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.pagada ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
                    >
                      {f.pagada ? "Pagada" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setRecepcion({ facturaId: f.id })}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                    >
                      📦 Cargar artículos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {facturasFiltradas.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-faint">Sin facturas cargadas.</p>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Nueva factura de compra</p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Proveedor</label>
            {proveedorSeleccionado ? (
              <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm">
                <span>{proveedorSeleccionado.razonSocial}</span>
                <button
                  onClick={() => setProveedorId("")}
                  className="text-xs font-medium text-danger"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={proveedorSearch}
                  onChange={(e) => setProveedorSearch(e.target.value)}
                  placeholder="Razón social…"
                  className={FIELD}
                />
                {proveedorSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                    {proveedorSuggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProveedorId(p.id);
                          setProveedorSearch("");
                        }}
                        className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                      >
                        {p.razonSocial}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowNuevoProveedor(true)}
                  className="mt-1.5 text-xs font-semibold text-copper hover:underline"
                >
                  + Nuevo proveedor
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL}>Tipo de comprobante</label>
            <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className={FIELD}>
              {["Factura A", "Factura B", "Factura C", "Nota de Crédito", "Remito"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL}>A nombre de (CUIT propio)</label>
            <select
              value={empresaIdx}
              onChange={(e) => setEmpresaIdx(Number(e.target.value))}
              className={FIELD}
            >
              {EMPRESAS.map((e, i) => (
                <option key={e.cuit} value={i}>
                  {e.razonSocial}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Punto de venta</label>
              <input
                ref={refs.pv}
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
                onKeyDown={nextOnEnter(refs.numero)}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>N° de factura</label>
              <input
                ref={refs.numero}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={nextOnEnter(refs.llegada)}
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Fecha de llegada</label>
              <input
                ref={refs.llegada}
                type="date"
                value={fechaLlegada}
                onChange={(e) => setFechaLlegada(e.target.value)}
                onKeyDown={nextOnEnter(refs.fecha)}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Fecha de factura</label>
              <input
                ref={refs.fecha}
                type="date"
                value={fechaFactura}
                onChange={(e) => setFechaFactura(e.target.value)}
                onKeyDown={nextOnEnter(refs.neto)}
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Neto</label>
              <input
                ref={refs.neto}
                type="number"
                value={neto}
                onChange={(e) => setNeto(e.target.value)}
                onKeyDown={nextOnEnter(refs.iva)}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>IVA</label>
              <input
                ref={refs.iva}
                type="number"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
                onKeyDown={nextOnEnter(refs.otros)}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Otros imp.</label>
              <input
                ref={refs.otros}
                type="number"
                value={otros}
                onChange={(e) => setOtros(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    guardarFactura();
                  }
                }}
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex justify-between rounded-lg bg-bg px-3 py-2 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">
              {money((Number(neto) || 0) + (Number(iva) || 0) + (Number(otros) || 0))}
            </span>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}

          <button
            onClick={guardarFactura}
            disabled={saving}
            className="rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar factura"}
          </button>
        </div>
      </div>

      {showNuevoProveedor && (
        <NuevoProveedorModal
          onClose={() => setShowNuevoProveedor(false)}
          onSaved={(p) => {
            onProveedorCreado(p);
            setProveedorId(p.id);
            setShowNuevoProveedor(false);
          }}
        />
      )}

      {recepcion && (
        <RecepcionModal facturaId={recepcion.facturaId} onClose={() => setRecepcion(null)} />
      )}
    </div>
  );
}

function NuevoProveedorModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (p: Proveedor) => void;
}) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (!razonSocial.trim()) return setError("La razón social es obligatoria.");
    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("proveedores")
      .insert({
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        email: email.trim(),
      })
      .select("id, razon_social, cuit, telefono, direccion, email")
      .single();
    setSaving(false);
    if (err || !data) return setError("No se pudo guardar el proveedor.");
    onSaved({
      id: data.id,
      razonSocial: data.razon_social,
      cuit: data.cuit,
      telefono: data.telefono,
      direccion: data.direccion,
      email: data.email,
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-sm rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">Nuevo proveedor</h2>
        <div className="mt-4 flex flex-col gap-3">
          <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Razón social" className={FIELD} />
          <input value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="CUIT/CUIL" className={FIELD} />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className={FIELD} />
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección" className={FIELD} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Mail" className={FIELD} />
        </div>
        {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={guardar} disabled={saving} className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function RecepcionModal({ facturaId, onClose }: { facturaId: string; onClose: () => void }) {
  const [items, setItems] = useState<{ codigo: string; cantidad: number }[]>([]);
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestions = useBuscadorArticulos(term, 5);

  function addItem(codigo: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.codigo === codigo);
      if (existing) return prev.map((i) => (i.codigo === codigo ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { codigo, cantidad: 1 }];
    });
    setTerm("");
  }

  async function finalizar() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("factura_compra_items").insert(
      items.map((i) => ({ factura_id: facturaId, codigo: i.codigo, cantidad: i.cantidad })),
    );
    const arts = await buscarArticulosPorCodigos(supabase, items.map((i) => i.codigo));
    for (const it of items) {
      const art = arts.find((a) => a.codigo === it.codigo);
      if (art) await supabase.rpc("devolver_stock", { p_articulo_id: art.id, p_cantidad: it.cantidad });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-lg rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          Cargar artículos recibidos
        </h2>
        <p className="mt-1 text-xs text-ink-faint">Es opcional — podés omitirlo y cargarlo después.</p>

        <div className="relative mt-3">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar artículo por código o descripción…"
            className={FIELD}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
              {suggestions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => addItem(a.codigo)}
                  className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                >
                  {a.codigo} — {a.descripcion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {items.map((it, i) => (
            <div key={it.codigo} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{it.codigo}</span>
              <input
                type="number"
                value={it.cantidad}
                onChange={(e) =>
                  setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, cantidad: Number(e.target.value) || 1 } : p)))
                }
                className="w-20 rounded border border-border px-2 py-1 text-right font-mono text-xs"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={finalizar}
            disabled={saving || items.length === 0}
            className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Finalizar y actualizar stock"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg">
            Omitir por ahora
          </button>
        </div>
      </div>
    </div>
  );
}
