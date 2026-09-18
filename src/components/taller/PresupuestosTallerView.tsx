"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { Articulo } from "@/lib/articulos/types";
import type { Cliente } from "@/lib/clientes/types";
import type { CartItem } from "@/lib/ventas/types";
import { presupuestoTallerFromRow, type PresupuestoTaller, type PresupuestoTallerRow } from "@/lib/taller/types";
import BuscadorArticulos from "@/components/articulos/BuscadorArticulos";

const FIELD_BASE =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const FIELD = `${FIELD_BASE} w-full`;

export default function PresupuestosTallerView({
  initialClientes,
  initialPresupuestos,
}: {
  initialClientes: Cliente[];
  initialPresupuestos: PresupuestoTaller[];
}) {
  const [clientes] = useState(initialClientes);
  const [presupuestos, setPresupuestos] = useState(initialPresupuestos);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [entryMode, setEntryMode] = useState<"code" | "manual">("code");
  const [manDesc, setManDesc] = useState("");
  const [manQty, setManQty] = useState("1");
  const [manPrice, setManPrice] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discIva, setDiscIva] = useState(false);
  const [desc10, setDesc10] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [buscarCliente, setBuscarCliente] = useState("");

  const clienteSuggestions = useMemo(() => {
    const q = clienteNombre.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes.filter((c) => c.razonSocial.toLowerCase().includes(q)).slice(0, 5);
  }, [clienteNombre, clientes]);

  function addToCart(a: Articulo) {
    setCart((prev) => {
      const existing = prev.find((c) => c.codigo === a.codigo);
      if (existing) return prev.map((c) => (c.codigo === a.codigo ? { ...c, cantidad: c.cantidad + 1 } : c));
      return [...prev, { codigo: a.codigo, descripcion: a.descripcion, marca: a.marca, precio: a.precioMinorista, cantidad: 1, iva: a.iva }];
    });
  }
  function addManual() {
    const price = parseFloat(manPrice) || 0;
    const qty = parseFloat(manQty) || 1;
    if (!manDesc.trim() || price <= 0) return setError("Completá descripción y precio.");
    setCart((prev) => [...prev, { codigo: null, descripcion: manDesc.trim(), marca: "", precio: price, cantidad: qty, iva: 21 }]);
    setManDesc("");
    setManQty("1");
    setManPrice("");
  }

  const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const descuento = desc10 ? subtotal * 0.1 : 0;
  const total = subtotal - descuento;

  async function guardar() {
    if (cart.length === 0 || !clienteNombre.trim()) {
      setError("Completá el cliente y agregá al menos un ítem.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    try {
      const { data: n, error: seqErr } = await supabase.rpc("next_presupuesto_taller_numero");
      if (seqErr) throw seqErr;
      const numero = `PT-${n}`;
      const { data: row, error: insErr } = await supabase
        .from("presupuestos_taller")
        .insert({
          numero,
          cliente_nombre: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim(),
          subtotal,
          descuento,
          discrimina_iva: discIva,
        })
        .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, discrimina_iva, estado, cobro_no_hizo, creado_en")
        .single();
      if (insErr || !row) throw insErr;

      await supabase.from("presupuesto_taller_items").insert(
        cart.map((c) => ({
          presupuesto_id: row.id,
          codigo: c.codigo,
          descripcion: c.descripcion,
          marca: c.marca,
          cantidad: c.cantidad,
          precio: c.precio,
          iva: c.iva,
        })),
      );

      setPresupuestos((prev) => [presupuestoTallerFromRow(row as PresupuestoTallerRow), ...prev]);
      setCart([]);
      setClienteNombre("");
      setClienteTelefono("");
      setDesc10(false);
      setDiscIva(false);
    } catch {
      setError("No se pudo guardar el presupuesto.");
    }
    setSaving(false);
  }

  async function loHace(p: PresupuestoTaller) {
    const supabase = createClient();
    const { data: items } = await supabase
      .from("presupuesto_taller_items")
      .select("codigo, descripcion, marca, cantidad, precio, iva")
      .eq("presupuesto_id", p.id);

    const { data: n, error: seqErr } = await supabase.rpc("next_reparacion_numero");
    if (seqErr) return;
    const numero = `REP-${n}`;
    const { data: rep } = await supabase
      .from("reparaciones")
      .insert({
        numero,
        cliente_nombre: p.clienteNombre,
        cliente_telefono: p.clienteTelefono,
        subtotal: p.subtotal,
        descuento: p.descuento,
        total: p.subtotal - p.descuento,
        discrimina_iva: p.discriminaIva,
        condicion_pago: "efectivo",
      })
      .select("id")
      .single();
    if (rep && items) {
      await supabase.from("reparacion_items").insert(
        items.map((it) => ({
          reparacion_id: rep.id,
          codigo: it.codigo,
          descripcion: it.descripcion,
          marca: it.marca,
          cantidad: it.cantidad,
          precio: it.precio,
          iva: it.iva,
        })),
      );
    }
    await supabase.from("presupuestos_taller").update({ estado: "Exportado" }).eq("id", p.id);
    setPresupuestos((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: "Exportado" } : x)));
  }

  async function noLoHace(p: PresupuestoTaller) {
    const importeStr = window.prompt("¿Cuánto se cobra por el trabajo de armar el presupuesto?");
    if (importeStr === null) return;
    const importe = parseFloat(importeStr) || 0;
    const supabase = createClient();
    await supabase.from("presupuestos_taller").update({ estado: "NoLoHizo", cobro_no_hizo: importe }).eq("id", p.id);
    setPresupuestos((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: "NoLoHizo", cobroNoHizo: importe } : x)));
  }

  const filtrados = presupuestos.filter((p) => !buscarCliente || p.clienteNombre.toLowerCase().includes(buscarCliente.toLowerCase()));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className="relative">
            <input
              value={clienteNombre}
              onChange={(e) => {
                setClienteNombre(e.target.value);
                setShowSuggest(true);
              }}
              placeholder="Nombre / empresa del cliente"
              className={FIELD}
            />
            {showSuggest && clienteSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                {clienteSuggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteNombre(c.razonSocial);
                      setClienteTelefono(c.telefono);
                      setShowSuggest(false);
                    }}
                    className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                  >
                    {c.razonSocial} <span className="text-xs text-ink-faint">{c.telefono}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} placeholder="Teléfono" className={FIELD} />
        </div>

        <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-3.5">
          <div className="mb-2 flex gap-1 border-b border-border">
            {(["code", "manual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setEntryMode(m)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${entryMode === m ? "border-copper text-ink" : "border-transparent text-ink-faint"}`}
              >
                {m === "code" ? "Por código" : "Manual"}
              </button>
            ))}
          </div>
          {entryMode === "code" ? (
            <BuscadorArticulos onSelect={addToCart} />
          ) : (
            <div className="flex gap-2">
              <input value={manDesc} onChange={(e) => setManDesc(e.target.value)} placeholder="Descripción" className={`${FIELD_BASE} flex-1`} />
              <input type="number" value={manQty} onChange={(e) => setManQty(e.target.value)} className={`${FIELD_BASE} w-16`} />
              <input type="number" value={manPrice} onChange={(e) => setManPrice(e.target.value)} placeholder="Precio" className={`${FIELD_BASE} w-28`} />
              <button onClick={addManual} className="whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">
                Agregar
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-2.5 py-2">Descripción</th>
                <th className="px-2.5 py-2">Cant.</th>
                <th className="px-2.5 py-2">Precio</th>
                <th className="px-2.5 py-2">Subtotal</th>
                <th className="px-2.5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-none">
                  <td className="px-2.5 py-2">{c.descripcion}</td>
                  <td className="px-2.5 py-2">{c.cantidad}</td>
                  <td className="px-2.5 py-2 font-mono text-xs">{money(c.precio)}</td>
                  <td className="px-2.5 py-2 font-mono text-xs">{money(c.precio * c.cantidad)}</td>
                  <td className="px-2.5 py-2">
                    <button onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs font-medium text-danger">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-faint">Sin ítems todavía.</p>}
        </div>

        <div className="mt-4">
          <input
            value={buscarCliente}
            onChange={(e) => setBuscarCliente(e.target.value)}
            placeholder="Buscar presupuestos por cliente…"
            className={`${FIELD} mb-2 max-w-sm`}
          />
          <div className="flex flex-col gap-1.5">
            {filtrados.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span>
                    {p.numero} · {p.clienteNombre}
                  </span>
                  {p.estado === "NoLoHizo" && (
                    <span className="ml-2 text-xs text-ink-faint">
                      No lo hizo — cobrado {money(p.cobroNoHizo ?? 0)}
                    </span>
                  )}
                  {p.estado === "Exportado" && <span className="ml-2 text-xs text-success">Exportado a Reparaciones</span>}
                </div>
                <div className="flex items-center gap-2">
                  <b className="font-mono">{money(p.subtotal - p.descuento)}</b>
                  {p.estado === "Pendiente" && (
                    <>
                      <button onClick={() => loHace(p)} className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success hover:opacity-80">
                        ✅ Lo hace
                      </button>
                      <button onClick={() => noLoHace(p)} className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger hover:opacity-80">
                        ✕ No lo hace
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtrados.length === 0 && <p className="text-sm text-ink-faint">Sin presupuestos de taller cargados.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <label className="mb-2 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={desc10} onChange={(e) => setDesc10(e.target.checked)} />
          Aplicar 10% off
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={discIva} onChange={(e) => setDiscIva(e.target.checked)} />
          Discriminar IVA (21%)
        </label>

        {error && <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}

        <div className="flex justify-between border-b border-border py-1.5 text-sm">
          <span className="text-ink-soft">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between py-2 text-base font-bold">
          <span>Total</span>
          <span className="font-mono">{money(total)}</span>
        </div>

        <button
          onClick={guardar}
          disabled={saving}
          className="mt-2 w-full rounded-lg bg-copper px-4 py-3 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar presupuesto"}
        </button>
      </div>
    </div>
  );
}
