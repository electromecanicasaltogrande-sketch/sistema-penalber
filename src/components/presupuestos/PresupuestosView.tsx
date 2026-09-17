"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { articleMatches } from "@/lib/search";
import { money } from "@/lib/format";
import type { Articulo } from "@/lib/articulos/types";
import type { Cliente } from "@/lib/clientes/types";
import type { CartItem } from "@/lib/ventas/types";
import type { PresupuestoConfig, PresupuestoVenta } from "@/lib/presupuestos/types";
import PresupuestoPrint, { type PresupuestoPrintData } from "@/lib/presupuestos/print";

type TopTab = "nuevo" | "historial";
type SubTab = "datos" | "config";

const FIELD_BASE =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const FIELD = `${FIELD_BASE} w-full`;
const LABEL = "text-xs font-semibold text-ink-soft";

export default function PresupuestosView({
  initialClientes,
  initialArticulos,
  initialConfig,
  initialPresupuestos,
}: {
  initialClientes: Cliente[];
  initialArticulos: Articulo[];
  initialConfig: PresupuestoConfig;
  initialPresupuestos: PresupuestoVenta[];
}) {
  const router = useRouter();
  const [topTab, setTopTab] = useState<TopTab>("nuevo");
  const [subTab, setSubTab] = useState<SubTab>("datos");

  const [clientes] = useState(initialClientes);
  const [articulos] = useState(initialArticulos);
  const [presupuestos, setPresupuestos] = useState(initialPresupuestos);
  const [config, setConfig] = useState(initialConfig);

  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [lista, setLista] = useState<"minorista" | "mayorista">("minorista");

  const [entryMode, setEntryMode] = useState<"code" | "manual">("code");
  const [scanTerm, setScanTerm] = useState("");
  const [manDesc, setManDesc] = useState("");
  const [manQty, setManQty] = useState("1");
  const [manPrice, setManPrice] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [printDoc, setPrintDoc] = useState<PresupuestoPrintData | null>(null);

  const [histCliente, setHistCliente] = useState("");
  const [histNumero, setHistNumero] = useState("");
  const [histDesde, setHistDesde] = useState("");
  const [histHasta, setHistHasta] = useState("");

  const clienteSuggestions = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return [];
    return clientes.filter((c) => c.razonSocial.toLowerCase().includes(q)).slice(0, 6);
  }, [clienteSearch, clientes]);

  const scanSuggestions = useMemo(() => {
    const q = scanTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    const exact = articulos.find((a) => a.codigo.toLowerCase() === q);
    if (exact) return [];
    return articulos.filter((a) => articleMatches(a, q)).slice(0, 5);
  }, [scanTerm, articulos]);

  function addToCart(a: Articulo) {
    const precio = lista === "minorista" ? a.precioMinorista : a.precioMayorista;
    setCart((prev) => {
      const existing = prev.find((c) => c.codigo === a.codigo);
      if (existing) return prev.map((c) => (c.codigo === a.codigo ? { ...c, cantidad: c.cantidad + 1 } : c));
      return [...prev, { codigo: a.codigo, descripcion: a.descripcion, marca: a.marca, precio, cantidad: 1, iva: a.iva }];
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

  const total = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);

  async function guardarConfig() {
    const supabase = createClient();
    await supabase
      .from("presupuesto_config")
      .update({
        texto_intro: config.textoIntro,
        observaciones: config.observaciones,
        dias_validez: config.diasValidez,
        firma: config.firma,
        mostrar_empresa: config.mostrarEmpresa,
      })
      .eq("id", true);
  }

  async function generarPresupuesto() {
    if (cart.length === 0) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const clienteLabel = selectedCliente?.razonSocial ?? "Consumidor Final";
    try {
      const { data: n, error: seqErr } = await supabase.rpc("next_presupuesto_numero");
      if (seqErr) throw seqErr;
      const numero = `PV-${n}`;
      const { data: row, error: insErr } = await supabase
        .from("presupuestos_venta")
        .insert({
          numero,
          cliente_id: selectedCliente?.id ?? null,
          cliente_nombre: clienteLabel,
          lista_precio: lista,
          subtotal: total,
        })
        .select("id, numero, cliente_id, cliente_nombre, lista_precio, subtotal, estado, creado_en")
        .single();
      if (insErr || !row) throw insErr;

      await supabase.from("presupuesto_venta_items").insert(
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

      setPresupuestos((prev) => [
        {
          id: row.id,
          numero: row.numero,
          clienteId: row.cliente_id,
          clienteNombre: row.cliente_nombre,
          listaPrecio: row.lista_precio,
          subtotal: Number(row.subtotal),
          estado: row.estado,
          creadoEn: row.creado_en,
        },
        ...prev,
      ]);

      setPrintDoc({
        numero,
        clienteNombre: clienteLabel,
        items: cart,
        total,
        fecha: new Date().toLocaleDateString("es-AR"),
        config,
      });
      setCart([]);
    } catch {
      setError("No se pudo generar el presupuesto.");
    }
    setSaving(false);
  }

  async function verImprimirHistorial(p: PresupuestoVenta) {
    const supabase = createClient();
    const { data } = await supabase
      .from("presupuesto_venta_items")
      .select("codigo, descripcion, marca, cantidad, precio, iva")
      .eq("presupuesto_id", p.id);
    setPrintDoc({
      numero: p.numero,
      clienteNombre: p.clienteNombre,
      items: (data ?? []).map((it) => ({
        codigo: it.codigo,
        descripcion: it.descripcion,
        marca: it.marca ?? "",
        cantidad: Number(it.cantidad),
        precio: Number(it.precio),
        iva: Number(it.iva),
      })),
      total: p.subtotal,
      fecha: new Date(p.creadoEn).toLocaleDateString("es-AR"),
      config,
    });
  }

  async function facturar(p: PresupuestoVenta) {
    const supabase = createClient();
    await supabase.from("presupuestos_venta").update({ estado: "Facturado" }).eq("id", p.id);
    setPresupuestos((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: "Facturado" } : x)));
    router.push(`/ventas?presupuesto=${p.id}`);
  }

  const presupuestosFiltrados = presupuestos.filter((p) => {
    if (histCliente && !p.clienteNombre.toLowerCase().includes(histCliente.toLowerCase())) return false;
    if (histNumero && !p.numero.toLowerCase().includes(histNumero.toLowerCase())) return false;
    if (histDesde && p.creadoEn.slice(0, 10) < histDesde) return false;
    if (histHasta && p.creadoEn.slice(0, 10) > histHasta) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {(
          [
            ["nuevo", "Nuevo presupuesto"],
            ["historial", "Historial de presupuestos"],
          ] as [TopTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTopTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              topTab === id ? "border-copper text-ink" : "border-transparent text-ink-faint"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {topTab === "nuevo" && (
        <div>
          <div className="mb-4 flex gap-1 border-b border-border">
            {(
              [
                ["datos", "Presupuesto"],
                ["config", "Configuración"],
              ] as [SubTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSubTab(id)}
                className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium ${
                  subTab === id ? "border-copper text-ink" : "border-transparent text-ink-faint"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {subTab === "datos" && (
            <div className="grid grid-cols-[1.4fr_1fr] gap-5">
              <div>
                <div className="mb-3 grid grid-cols-2 gap-2.5">
                  <div className="relative">
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
                        <input
                          value={clienteSearch}
                          onChange={(e) => setClienteSearch(e.target.value)}
                          placeholder="Nombre o razón social"
                          className={`${FIELD} mt-1`}
                        />
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
                  <div>
                    <label className={LABEL}>Lista de precios</label>
                    <select value={lista} onChange={(e) => setLista(e.target.value as "minorista" | "mayorista")} className={`${FIELD} mt-1`}>
                      <option value="minorista">Lista minorista</option>
                      <option value="mayorista">Lista mayorista</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3 rounded-[var(--radius-app)] border border-border bg-surface p-3.5">
                  <div className="mb-2 flex gap-1 border-b border-border">
                    {(["code", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setEntryMode(m)}
                        className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${
                          entryMode === m ? "border-copper text-ink" : "border-transparent text-ink-faint"
                        }`}
                      >
                        {m === "code" ? "Por código" : "Manual"}
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
                              <span className="font-mono text-xs">
                                {money(lista === "minorista" ? a.precioMinorista : a.precioMayorista)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                        <th className="px-2.5 py-2">Código</th>
                        <th className="px-2.5 py-2">Artículo</th>
                        <th className="px-2.5 py-2">Cant.</th>
                        <th className="px-2.5 py-2">Precio</th>
                        <th className="px-2.5 py-2">Subtotal</th>
                        <th className="px-2.5 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((c, i) => (
                        <tr key={i} className="border-b border-border last:border-none">
                          <td className="px-2.5 py-2 font-mono text-xs">{c.codigo ?? "—"}</td>
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
              </div>

              <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
                <div className="flex justify-between border-b border-border py-2 text-base font-bold">
                  <span>Total</span>
                  <span className="font-mono">{money(total)}</span>
                </div>
                {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
                <button
                  onClick={generarPresupuesto}
                  disabled={cart.length === 0 || saving}
                  className="mt-3 w-full rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
                >
                  {saving ? "Generando…" : "Generar presupuesto"}
                </button>
              </div>
            </div>
          )}

          {subTab === "config" && (
            <div className="max-w-lg rounded-[var(--radius-app)] border border-border bg-surface p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Texto de introducción</label>
                  <textarea
                    value={config.textoIntro}
                    onChange={(e) => setConfig({ ...config, textoIntro: e.target.value })}
                    className={`${FIELD} h-16`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Observaciones</label>
                  <textarea
                    value={config.observaciones}
                    onChange={(e) => setConfig({ ...config, observaciones: e.target.value })}
                    className={`${FIELD} h-20`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Días de validez</label>
                  <input
                    type="number"
                    value={config.diasValidez}
                    onChange={(e) => setConfig({ ...config, diasValidez: Number(e.target.value) || 0 })}
                    className={FIELD}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Firma</label>
                  <input value={config.firma} onChange={(e) => setConfig({ ...config, firma: e.target.value })} className={FIELD} />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={config.mostrarEmpresa}
                    onChange={(e) => setConfig({ ...config, mostrarEmpresa: e.target.checked })}
                  />
                  Imprimir empresa bajo la firma
                </label>
                <button onClick={guardarConfig} className="rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark">
                  Guardar configuración
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {topTab === "historial" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <input value={histCliente} onChange={(e) => setHistCliente(e.target.value)} placeholder="Cliente…" className={`${FIELD} max-w-[200px]`} />
            <input value={histNumero} onChange={(e) => setHistNumero(e.target.value)} placeholder="N° presupuesto…" className={`${FIELD} max-w-[160px]`} />
            <input type="date" value={histDesde} onChange={(e) => setHistDesde(e.target.value)} className={FIELD} />
            <span className="text-xs text-ink-faint">a</span>
            <input type="date" value={histHasta} onChange={(e) => setHistHasta(e.target.value)} className={FIELD} />
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Lista</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {presupuestosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-none">
                    <td className="px-3 py-2.5 font-mono text-xs">{p.numero}</td>
                    <td className="px-3 py-2.5">{new Date(p.creadoEn).toLocaleDateString("es-AR")}</td>
                    <td className="px-3 py-2.5">{p.clienteNombre}</td>
                    <td className="px-3 py-2.5 text-xs capitalize">{p.listaPrecio}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold">{money(p.subtotal)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.estado === "Facturado" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => verImprimirHistorial(p)} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg">
                          Ver / Imprimir
                        </button>
                        {p.estado === "Pendiente" && (
                          <button onClick={() => facturar(p)} className="rounded-full bg-copper px-2.5 py-1 text-xs font-semibold text-white hover:bg-copper-dark">
                            Facturar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {presupuestosFiltrados.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-ink-faint">Sin presupuestos que coincidan.</p>
            )}
          </div>
        </div>
      )}

      {printDoc && <PresupuestoPrint doc={printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  );
}
