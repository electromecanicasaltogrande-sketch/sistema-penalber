"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { articleMatches } from "@/lib/search";
import { money } from "@/lib/format";
import type { Articulo } from "@/lib/articulos/types";
import type { Cliente } from "@/lib/clientes/types";
import type { CartItem, CondicionPago } from "@/lib/ventas/types";
import { FORMAS_PAGO } from "@/lib/ventas/types";
import ChequeModal, { type ChequeData } from "@/components/ventas/ChequeModal";
import ReciboTaller, { type ReciboTallerData } from "@/lib/taller/print";
import { reparacionFromRow, type Reparacion, type ReparacionRow } from "@/lib/taller/types";

const FIELD_BASE =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const FIELD = `${FIELD_BASE} w-full`;

export default function ReparacionesView({
  initialArticulos,
  initialClientes,
  initialReparaciones,
}: {
  initialArticulos: Articulo[];
  initialClientes: Cliente[];
  initialReparaciones: Reparacion[];
}) {
  const searchParams = useSearchParams();
  const [articulos, setArticulos] = useState(initialArticulos);
  const [clientes] = useState(initialClientes);
  const [reparaciones, setReparaciones] = useState(initialReparaciones);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  const [entryMode, setEntryMode] = useState<"code" | "manual">("code");
  const [scanTerm, setScanTerm] = useState("");
  const [manDesc, setManDesc] = useState("");
  const [manQty, setManQty] = useState("1");
  const [manPrice, setManPrice] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discIva, setDiscIva] = useState(false);
  const [desc10, setDesc10] = useState(false);
  const [condicionPago, setCondicionPago] = useState<CondicionPago>("efectivo");
  const [chequeModal, setChequeModal] = useState<{ tipo: "cheque" | "echeq" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recibo, setRecibo] = useState<ReciboTallerData | null>(null);
  const [buscarCliente, setBuscarCliente] = useState("");

  useEffect(() => {
    const tallerId = searchParams.get("taller");
    if (!tallerId) return;
    (async () => {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("presupuestos_taller")
        .select("cliente_nombre, cliente_telefono, discrimina_iva, descuento")
        .eq("id", tallerId)
        .single();
      const { data: items } = await supabase
        .from("presupuesto_taller_items")
        .select("codigo, descripcion, marca, cantidad, precio, iva")
        .eq("presupuesto_id", tallerId);
      if (p) {
        setClienteNombre(p.cliente_nombre);
        setClienteTelefono(p.cliente_telefono);
        setDiscIva(p.discrimina_iva);
        setDesc10(p.descuento > 0);
      }
      if (items) {
        setCart(
          items.map((it) => ({
            codigo: it.codigo,
            descripcion: it.descripcion,
            marca: it.marca ?? "",
            cantidad: Number(it.cantidad),
            precio: Number(it.precio),
            iva: Number(it.iva),
          })),
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const clienteSuggestions = useMemo(() => {
    const q = clienteNombre.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes.filter((c) => c.razonSocial.toLowerCase().includes(q)).slice(0, 5);
  }, [clienteNombre, clientes]);

  const scanSuggestions = useMemo(() => {
    const q = scanTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    const exact = articulos.find((a) => a.codigo.toLowerCase() === q);
    if (exact) return [];
    return articulos.filter((a) => articleMatches(a, q)).slice(0, 5);
  }, [scanTerm, articulos]);

  function addToCart(a: Articulo) {
    setCart((prev) => {
      const existing = prev.find((c) => c.codigo === a.codigo);
      if (existing) return prev.map((c) => (c.codigo === a.codigo ? { ...c, cantidad: c.cantidad + 1 } : c));
      return [...prev, { codigo: a.codigo, descripcion: a.descripcion, marca: a.marca, precio: a.precioMinorista, cantidad: 1, iva: a.iva }];
    });
    setScanTerm("");
  }
  function addByCode() {
    const term = scanTerm.trim();
    if (!term) return;
    const exact = articulos.find((a) => a.codigo.toLowerCase() === term.toLowerCase());
    if (exact) return addToCart(exact);
    const matches = articulos.filter((a) => articleMatches(a, term));
    if (matches.length >= 1) return addToCart(matches[0]);
    setError("No se encontró ningún artículo con ese código.");
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

  function confirmar() {
    if (cart.length === 0 || !clienteNombre.trim()) {
      setError("Completá el cliente y agregá al menos un ítem.");
      return;
    }
    if (condicionPago === "cheque" || condicionPago === "echeq") {
      setChequeModal({ tipo: condicionPago });
      return;
    }
    finalizar(null);
  }

  async function finalizar(chequeData: ChequeData | null) {
    setSaving(true);
    setError("");
    const supabase = createClient();
    try {
      const { data: n, error: seqErr } = await supabase.rpc("next_reparacion_numero");
      if (seqErr) throw seqErr;
      const numero = `REP-${n}`;

      const { data: row, error: insErr } = await supabase
        .from("reparaciones")
        .insert({
          numero,
          cliente_nombre: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim(),
          subtotal,
          descuento,
          total,
          discrimina_iva: discIva,
          condicion_pago: condicionPago,
        })
        .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, total, discrimina_iva, condicion_pago, entregada, creado_en")
        .single();
      if (insErr || !row) throw insErr;

      await supabase.from("reparacion_items").insert(
        cart.map((c) => ({
          reparacion_id: row.id,
          codigo: c.codigo,
          descripcion: c.descripcion,
          marca: c.marca,
          cantidad: c.cantidad,
          precio: c.precio,
          iva: c.iva,
        })),
      );

      for (const c of cart) {
        if (!c.codigo) continue;
        const art = articulos.find((a) => a.codigo === c.codigo);
        if (art) await supabase.rpc("descontar_stock", { p_articulo_id: art.id, p_cantidad: c.cantidad });
      }
      setArticulos((prev) =>
        prev.map((a) => {
          const line = cart.find((c) => c.codigo === a.codigo);
          return line ? { ...a, stock: a.stock - line.cantidad } : a;
        }),
      );

      if ((condicionPago === "cheque" || condicionPago === "echeq") && chequeData) {
        await supabase.from("cheques").insert({
          tipo: condicionPago,
          titular: chequeData.titular,
          importe: total,
          fecha_cobro: chequeData.fechaCobro,
          fecha_vencimiento: chequeData.fechaVencimiento,
          origen: "Reparación",
          origen_numero: numero,
        });
      }

      setReparaciones((prev) => [reparacionFromRow(row as ReparacionRow), ...prev]);
      setRecibo({
        titulo: "Reparación",
        numero,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        items: cart,
        subtotal,
        descuento,
        total,
        condicionPago: FORMAS_PAGO.find((f) => f.id === condicionPago)?.label ?? condicionPago,
        fecha: new Date().toLocaleDateString("es-AR"),
      });

      setCart([]);
      setClienteNombre("");
      setClienteTelefono("");
      setChequeModal(null);
    } catch {
      setError("No se pudo registrar la reparación.");
    }
    setSaving(false);
  }

  async function marcarEntregada(r: Reparacion) {
    const supabase = createClient();
    await supabase.from("reparaciones").update({ entregada: true }).eq("id", r.id);
    setReparaciones((prev) => prev.map((x) => (x.id === r.id ? { ...x, entregada: true } : x)));
  }

  const reparacionesFiltradas = reparaciones.filter(
    (r) => !buscarCliente || r.clienteNombre.toLowerCase().includes(buscarCliente.toLowerCase()),
  );

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
                {m === "code" ? "Repuestos por código" : "Mano de obra / manual"}
              </button>
            ))}
          </div>
          {entryMode === "code" ? (
            <div className="relative">
              <input
                value={scanTerm}
                onChange={(e) => setScanTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addByCode()}
                placeholder="Código o descripción…"
                className={FIELD}
              />
              {scanSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md">
                  {scanSuggestions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addToCart(a)}
                      className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
                    >
                      <span>{a.descripcion}</span>
                      <span className="font-mono text-xs">{money(a.precioMinorista)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={manDesc} onChange={(e) => setManDesc(e.target.value)} placeholder="Descripción / mano de obra" className={`${FIELD_BASE} flex-1`} />
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
                <th className="px-2.5 py-2">IVA</th>
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
                  <td className="px-2.5 py-2 font-mono text-xs">{discIva ? money(c.precio * c.cantidad - (c.precio * c.cantidad) / 1.21) : `${c.iva}%`}</td>
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
            placeholder="Buscar reparaciones por cliente…"
            className={`${FIELD} mb-2 max-w-sm`}
          />
          <div className="flex flex-col gap-1.5">
            {reparacionesFiltradas.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm ${r.entregada ? "text-ink-faint line-through" : ""}`}
              >
                <span>
                  {r.numero} · {r.clienteNombre}
                </span>
                <span className="flex items-center gap-2">
                  <b className="font-mono">{money(r.total)}</b>
                  {!r.entregada && (
                    <button
                      onClick={() => marcarEntregada(r)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                    >
                      Marcar entregada
                    </button>
                  )}
                </span>
              </div>
            ))}
            {reparacionesFiltradas.length === 0 && <p className="text-sm text-ink-faint">Sin reparaciones cargadas.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <label className="mb-2 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={discIva} onChange={(e) => setDiscIva(e.target.checked)} />
          Discriminar IVA (21%)
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={desc10} onChange={(e) => setDesc10(e.target.checked)} />
          Aplicar 10% off
        </label>

        <p className="mb-1.5 text-xs font-semibold text-ink-soft">Forma de pago</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {FORMAS_PAGO.map((f) => (
            <button
              key={f.id}
              onClick={() => setCondicionPago(f.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                condicionPago === f.id ? "border-copper bg-copper-soft text-copper-dark" : "border-border text-ink-soft hover:bg-bg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}

        <div className="flex justify-between border-b border-border py-1.5 text-sm">
          <span className="text-ink-soft">Subtotal</span>
          <span className="font-mono">{money(subtotal)}</span>
        </div>
        {desc10 && (
          <div className="flex justify-between border-b border-border py-1.5 text-sm text-danger">
            <span>Descuento</span>
            <span className="font-mono">-{money(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between py-2 text-base font-bold">
          <span>Total</span>
          <span className="font-mono">{money(total)}</span>
        </div>

        <button
          onClick={confirmar}
          disabled={saving}
          className="mt-2 w-full rounded-lg bg-copper px-4 py-3 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
        >
          {saving ? "Registrando…" : "Registrar reparación"}
        </button>
      </div>

      {chequeModal && (
        <ChequeModal
          tipo={chequeModal.tipo}
          importe={total}
          titularDefault={clienteNombre}
          onCancel={() => setChequeModal(null)}
          onConfirm={(data) => finalizar(data)}
        />
      )}

      {recibo && <ReciboTaller doc={recibo} onClose={() => setRecibo(null)} />}
    </div>
  );
}
