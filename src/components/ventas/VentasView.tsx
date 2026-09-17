"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { articleMatches } from "@/lib/search";
import { money } from "@/lib/format";
import { EMPRESAS } from "@/lib/empresas";
import type { Articulo } from "@/lib/articulos/types";
import type { Cliente } from "@/lib/clientes/types";
import { DOC_LABELS, FORMAS_PAGO, type CartItem, type CondicionPago, type DocType } from "@/lib/ventas/types";
import ComprobantePrint, { type ComprobanteDocData } from "@/lib/ventas/print";
import ChequeModal, { type ChequeData } from "./ChequeModal";

interface VentaHoy {
  id: string;
  numero: string;
  docType: DocType;
  clienteNombre: string;
  condicionPago: CondicionPago;
  total: number;
  hora: string;
}

const FIELD =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

export default function VentasView({
  initialArticulos,
  initialClientes,
}: {
  initialArticulos: Articulo[];
  initialClientes: Cliente[];
}) {
  const [articulos, setArticulos] = useState(initialArticulos);
  const [clientes] = useState(initialClientes);

  const [entryMode, setEntryMode] = useState<"code" | "manual">("code");
  const [scanTerm, setScanTerm] = useState("");
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const [manDesc, setManDesc] = useState("");
  const [manQty, setManQty] = useState("1");
  const [manPrice, setManPrice] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discIva, setDiscIva] = useState(false);
  const [desc10, setDesc10] = useState(false);

  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [dni, setDni] = useState("");

  const [empresaIdx, setEmpresaIdx] = useState(0);
  const [docType, setDocTypeState] = useState<DocType>("factura_b");
  const [condicionPago, setCondicionPago] = useState<CondicionPago>("efectivo");
  const [ncRef, setNcRef] = useState("");
  const [ncOptions, setNcOptions] = useState<{ numero: string; total: number }[]>([]);

  const [chequeModal, setChequeModal] = useState<{ tipo: "cheque" | "echeq" } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [printDoc, setPrintDoc] = useState<ComprobanteDocData | null>(null);

  const [ventasHoy, setVentasHoy] = useState<VentaHoy[]>([]);

  const searchParams = useSearchParams();
  useEffect(() => {
    const presupuestoId = searchParams.get("presupuesto");
    if (!presupuestoId) return;
    (async () => {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("presupuestos_venta")
        .select("cliente_id, cliente_nombre")
        .eq("id", presupuestoId)
        .single();
      const { data: items } = await supabase
        .from("presupuesto_venta_items")
        .select("codigo, descripcion, marca, cantidad, precio, iva")
        .eq("presupuesto_id", presupuestoId);
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
      if (p) {
        const match = clientes.find((c) => c.razonSocial === p.cliente_nombre);
        if (match) selectCliente(match);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isConsumidorFinal = selectedCliente?.esConsumidorFinal ?? true;
  const isNC = docType === "nc_a" || docType === "nc_b";
  const info = DOC_LABELS[docType];

  function applyConsFinalRules(cliente: Cliente | null, pago: CondicionPago) {
    const esCF = cliente?.esConsumidorFinal ?? true;
    if (esCF && !isNC) {
      const target: DocType = pago === "efectivo" ? "remito_r" : "factura_b";
      setDocTypeState(target);
    }
  }

  function selectCliente(c: Cliente | null) {
    setSelectedCliente(c);
    setClienteSearch("");
    if (c?.esConsumidorFinal) setEmpresaIdx(0);
    if (c?.esConsumidorFinal && condicionPago === "cta_cte") {
      setCondicionPago("efectivo");
      applyConsFinalRules(c, "efectivo");
    } else {
      applyConsFinalRules(c, condicionPago);
    }
    if (isNC) loadNcOptions(c);
  }

  function changeCondicionPago(pago: CondicionPago) {
    setCondicionPago(pago);
    applyConsFinalRules(selectedCliente, pago);
  }

  async function loadNcOptions(cliente: Cliente | null) {
    const label = cliente?.razonSocial ?? "Consumidor Final";
    const supabase = createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("ventas")
      .select("numero, total, doc_type")
      .eq("cliente_nombre", label)
      .in("doc_type", ["factura_a", "factura_b", "factura_c"])
      .gte("creado_en", startOfDay.toISOString());
    setNcOptions((data ?? []).map((d) => ({ numero: d.numero as string, total: Number(d.total) })));
  }

  function changeDocType(t: DocType) {
    setDocTypeState(t);
    if (t === "nc_a" || t === "nc_b") {
      loadNcOptions(selectedCliente);
    }
  }

  const clienteSuggestions = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return [];
    return clientes
      .filter((c) => !c.esConsumidorFinal)
      .filter((c) => c.razonSocial.toLowerCase().includes(q) || c.cuit.includes(q))
      .slice(0, 6);
  }, [clienteSearch, clientes]);

  const scanSuggestions = useMemo(() => {
    const q = scanTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    const exact = articulos.find((a) => a.codigo.toLowerCase() === q);
    if (exact) return [];
    return articulos.filter((a) => articleMatches(a, q)).slice(0, 5);
  }, [scanTerm, articulos]);

  function addToCart(articulo: Articulo) {
    if (articulo.stock <= 0) {
      setError(`Sin stock disponible de ${articulo.descripcion}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.codigo === articulo.codigo);
      if (existing) {
        if (existing.cantidad >= articulo.stock) {
          setError("No hay más stock disponible");
          return prev;
        }
        return prev.map((c) =>
          c.codigo === articulo.codigo ? { ...c, cantidad: c.cantidad + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          codigo: articulo.codigo,
          descripcion: articulo.descripcion,
          marca: articulo.marca,
          precio: articulo.precioMinorista,
          cantidad: 1,
          iva: articulo.iva,
          stockDisponible: articulo.stock,
        },
      ];
    });
    setScanTerm("");
    setError("");
    scanRef.current?.focus();
  }

  function addByCode() {
    const term = scanTerm.trim();
    if (!term) return;
    const byBarcode = articulos.find((a) => a.codigoBarras && a.codigoBarras === term);
    if (byBarcode) return addToCart(byBarcode);
    const exact = articulos.find((a) => a.codigo.toLowerCase() === term.toLowerCase());
    if (exact) return addToCart(exact);
    const matches = articulos.filter((a) => articleMatches(a, term));
    if (matches.length === 1) return addToCart(matches[0]);
    if (matches.length > 1) {
      if (pendingTerm === term) {
        addToCart(matches[0]);
        setPendingTerm(null);
      } else {
        setPendingTerm(term);
        setError("Hay varias coincidencias — apretá Enter de nuevo para agregar la primera");
      }
      return;
    }
    setError("No se encontró ningún artículo con ese código");
    setPendingTerm(null);
  }

  function addManual() {
    const price = parseFloat(manPrice) || 0;
    const qty = parseFloat(manQty) || 1;
    if (!manDesc.trim() || price <= 0) {
      setError("Completá la descripción y el precio.");
      return;
    }
    setCart((prev) => [
      ...prev,
      { codigo: null, descripcion: manDesc.trim(), marca: "", precio: price, cantidad: qty, iva: 21 },
    ]);
    setManDesc("");
    setManQty("1");
    setManPrice("");
  }

  function setQty(idx: number, val: number) {
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        let n = val;
        if (n < 1) n = 1;
        if (c.stockDisponible !== undefined && n > c.stockDisponible) n = c.stockDisponible;
        return { ...c, cantidad: n };
      }),
    );
  }
  function setPrecio(idx: number, val: number) {
    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, precio: Math.max(0, val) } : c)));
  }
  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const descuento = desc10 ? subtotal * 0.1 : 0;
  const total = subtotal - descuento;
  const neto = total / 1.21;
  const ivaMonto = total - neto;

  function confirmarVenta() {
    if (cart.length === 0) return;
    setError("");
    if (!isNC && (condicionPago === "cheque" || condicionPago === "echeq")) {
      setChequeModal({ tipo: condicionPago });
      return;
    }
    finalizarVenta(null);
  }

  async function finalizarVenta(chequeData: ChequeData | null) {
    setConfirming(true);
    setError("");
    const supabase = createClient();
    const empresa = EMPRESAS[empresaIdx];
    const clienteLabel = selectedCliente?.razonSocial ?? "Consumidor Final";

    try {
      const { data: n, error: seqErr } = await supabase.rpc("next_comprobante_numero");
      if (seqErr) throw seqErr;
      const numero = `${info.prefijo} ${empresa.puntoVenta}-${String(n).padStart(8, "0")}`;

      let cae: string | undefined;
      let caeVencimiento: string | undefined;
      if (info.hasCae) {
        cae = "7" + Math.floor(1000000000000 + Math.random() * 8999999999999).toString();
        const vto = new Date();
        vto.setDate(vto.getDate() + 10);
        caeVencimiento = vto.toLocaleDateString("es-AR");
      }

      const { data: ventaRow, error: ventaErr } = await supabase
        .from("ventas")
        .insert({
          numero,
          tipo: info.nombre,
          doc_type: docType,
          empresa_cuit: empresa.cuit,
          cliente_id: selectedCliente?.id ?? null,
          cliente_nombre: clienteLabel,
          dni: dni || null,
          condicion_pago: isNC ? "nc" : condicionPago,
          subtotal,
          descuento,
          total,
          discrimina_iva: discIva,
          cae: cae ?? null,
          cae_vencimiento: caeVencimiento
            ? new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().slice(0, 10)
            : null,
          nc_referencia_numero: isNC ? ncRef || null : null,
        })
        .select("id")
        .single();
      if (ventaErr || !ventaRow) throw ventaErr;

      await supabase.from("venta_items").insert(
        cart.map((c) => ({
          venta_id: ventaRow.id,
          codigo: c.codigo,
          descripcion: c.descripcion,
          marca: c.marca,
          cantidad: c.cantidad,
          precio: c.precio,
          iva: c.iva,
        })),
      );

      if (!isNC) {
        for (const c of cart) {
          if (!c.codigo) continue;
          const art = articulos.find((a) => a.codigo === c.codigo);
          if (!art) continue;
          await supabase.rpc("descontar_stock", { p_articulo_id: art.id, p_cantidad: c.cantidad });
        }
        setArticulos((prev) =>
          prev.map((a) => {
            const line = cart.find((c) => c.codigo === a.codigo);
            return line ? { ...a, stock: a.stock - line.cantidad } : a;
          }),
        );
      }

      if (condicionPago === "cta_cte" && selectedCliente && !isNC) {
        await supabase.from("cta_cte_comprobantes").insert({
          cliente_id: selectedCliente.id,
          empresa_cuit: empresa.cuit,
          tipo: info.nombre,
          numero,
          total,
        });
      }

      if ((condicionPago === "cheque" || condicionPago === "echeq") && chequeData) {
        await supabase.from("cheques").insert({
          tipo: condicionPago,
          titular: chequeData.titular,
          importe: total,
          fecha_cobro: chequeData.fechaCobro,
          fecha_vencimiento: chequeData.fechaVencimiento,
          origen: "Venta",
          origen_numero: numero,
        });
      }

      setVentasHoy((prev) => [
        {
          id: ventaRow.id,
          numero,
          docType,
          clienteNombre: clienteLabel,
          condicionPago,
          total,
          hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ]);

      setPrintDoc({
        docType,
        numero,
        empresa,
        clienteNombre: clienteLabel,
        dni: dni || undefined,
        condicionPagoLabel: isNC
          ? "Nota de crédito"
          : (FORMAS_PAGO.find((f) => f.id === condicionPago)?.label ?? condicionPago),
        items: cart,
        subtotal,
        descuento,
        total,
        cae,
        caeVencimiento,
        fecha: new Date().toLocaleDateString("es-AR"),
      });

      setCart([]);
      setChequeModal(null);
    } catch {
      setError("No se pudo registrar la venta. Reintentá.");
    }
    setConfirming(false);
  }

  return (
    <div className="grid grid-cols-[1.5fr_1fr] gap-5">
      <div>
        <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <div className="mb-3 flex gap-1 border-b border-border">
            {(["code", "manual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setEntryMode(m)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  entryMode === m ? "border-copper text-ink" : "border-transparent text-ink-faint"
                }`}
              >
                {m === "code" ? "Por código" : "Manual (nombre + precio)"}
              </button>
            ))}
          </div>

          {entryMode === "code" ? (
            <div className="relative">
              <input
                ref={scanRef}
                value={scanTerm}
                onChange={(e) => setScanTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addByCode()}
                placeholder="Escaneá o escribí el código / descripción…"
                className="w-full rounded-lg border-2 border-ink bg-[#101319] px-4 py-3.5 font-mono text-base text-[#7CF29C] outline-none focus:border-copper"
              />
              {scanSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-md">
                  {scanSuggestions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addToCart(a)}
                      className="flex w-full items-center justify-between border-b border-border px-3.5 py-2.5 text-left text-sm last:border-none hover:bg-bg"
                    >
                      <div>
                        <p>{a.descripcion}</p>
                        <p className="font-mono text-xs text-ink-faint">
                          {a.codigo} · {a.marca}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">{money(a.precioMinorista)}</p>
                        <p className="text-xs text-ink-faint">{a.stock} u.</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={manDesc}
                onChange={(e) => setManDesc(e.target.value)}
                placeholder="Descripción"
                className={`${FIELD} flex-1`}
              />
              <input
                type="number"
                value={manQty}
                onChange={(e) => setManQty(e.target.value)}
                className={`${FIELD} w-20`}
              />
              <input
                type="number"
                value={manPrice}
                onChange={(e) => setManPrice(e.target.value)}
                placeholder="Precio"
                className={`${FIELD} w-32`}
              />
              <button
                onClick={addManual}
                className="whitespace-nowrap rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
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
                <th className="px-2.5 py-2">Marca</th>
                <th className="px-2.5 py-2">Cantidad</th>
                <th className="px-2.5 py-2">Precio</th>
                <th className="px-2.5 py-2">IVA</th>
                <th className="px-2.5 py-2">Subtotal</th>
                <th className="px-2.5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-none">
                  <td className="px-2.5 py-2 font-mono text-xs">{c.codigo ?? "—"}</td>
                  <td className="px-2.5 py-2">{c.descripcion}</td>
                  <td className="px-2.5 py-2">{c.marca || "—"}</td>
                  <td className="px-2.5 py-2">
                    <input
                      type="number"
                      value={c.cantidad}
                      onChange={(e) => setQty(i, parseFloat(e.target.value) || 1)}
                      className="w-16 rounded border border-border px-1.5 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <input
                      type="number"
                      value={c.precio}
                      onChange={(e) => setPrecio(i, parseFloat(e.target.value) || 0)}
                      className="w-24 rounded border border-border px-1.5 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-2 font-mono text-xs">
                    {discIva ? money(c.precio * c.cantidad - (c.precio * c.cantidad) / 1.21) : `${c.iva}%`}
                  </td>
                  <td className="px-2.5 py-2 font-mono text-xs">{money(c.precio * c.cantidad)}</td>
                  <td className="px-2.5 py-2">
                    <button onClick={() => removeLine(i)} className="text-xs font-medium text-danger">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-faint">El carrito está vacío.</p>
          )}
        </div>

        <div className="mt-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-semibold text-ink">Ventas registradas hoy</p>
          {ventasHoy.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin ventas registradas todavía.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {ventasHoy.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {v.hora} · {v.clienteNombre} · {v.numero}
                  </span>
                  <span className="flex items-center gap-3">
                    <b className="font-mono">{money(v.total)}</b>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-[90px] flex flex-col gap-4 self-start">
        <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Cliente</p>
          {selectedCliente ? (
            <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{selectedCliente.razonSocial}</p>
                <p className="text-xs text-ink-faint">{selectedCliente.cuit}</p>
              </div>
              <button
                onClick={() => selectCliente(null)}
                className="text-xs font-medium text-danger"
              >
                Quitar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder="Nombre o razón social"
                className={FIELD}
              />
              {clienteSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-md">
                  {clienteSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCliente(c)}
                      className="block w-full border-b border-border px-3.5 py-2 text-left text-sm last:border-none hover:bg-bg"
                    >
                      <b>{c.razonSocial}</b>
                      <p className="text-xs text-ink-faint">{c.cuit}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => selectCliente(clientes.find((c) => c.esConsumidorFinal) ?? null)}
            className="mt-2 w-full rounded-lg border border-copper/40 bg-copper-soft px-3 py-2 text-sm font-semibold text-copper-dark hover:bg-copper-soft/70"
          >
            ⚡ Consumidor Final
          </button>
          {isConsumidorFinal && (
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="DNI (opcional)"
              className={`${FIELD} mt-2`}
            />
          )}
        </div>

        <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Tipo de comprobante</p>
          <select
            value={docType}
            onChange={(e) => changeDocType(e.target.value as DocType)}
            className={FIELD}
          >
            {Object.entries(DOC_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-ink-faint">{info.hint}</p>

          {isNC && (
            <div className="mt-2.5">
              <label className="text-xs font-semibold text-ink-soft">Factura que se corrige</label>
              <select value={ncRef} onChange={(e) => setNcRef(e.target.value)} className={`${FIELD} mt-1`}>
                <option value="">Elegí una factura…</option>
                {ncOptions.map((o) => (
                  <option key={o.numero} value={o.numero}>
                    {o.numero} — {money(o.total)}
                  </option>
                ))}
              </select>
              {ncOptions.length === 0 && (
                <p className="mt-1 text-[11px] text-ink-faint">
                  No hay facturas registradas hoy para este cliente.
                </p>
              )}
            </div>
          )}

          <div className="mt-2.5">
            <label className="text-xs font-semibold text-ink-soft">Empresa / CUIT que factura</label>
            <select
              value={empresaIdx}
              onChange={(e) => setEmpresaIdx(Number(e.target.value))}
              className={`${FIELD} mt-1`}
            >
              {EMPRESAS.map((e, i) => (
                <option key={e.cuit} value={i}>
                  {e.razonSocial} — Pto. {e.puntoVenta}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isNC && (
          <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold text-ink-soft">Condición de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGO.filter((f) => !(f.id === "cta_cte" && isConsumidorFinal)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => changeCondicionPago(f.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    condicionPago === f.id
                      ? "border-copper bg-copper-soft text-copper-dark"
                      : "border-border text-ink-soft hover:bg-bg"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[var(--radius-app)] border border-border bg-surface p-4">
          <label className="mb-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={discIva} onChange={(e) => setDiscIva(e.target.checked)} />
            Discriminar IVA (21%) al mostrar el total
          </label>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={desc10} onChange={(e) => setDesc10(e.target.checked)} />
            Aplicar 10% off
          </label>

          {error && (
            <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-mono">{money(subtotal)}</span>
          </div>
          {desc10 && (
            <div className="flex justify-between border-b border-border py-1.5 text-sm text-danger">
              <span>Descuento 10%</span>
              <span className="font-mono">-{money(descuento)}</span>
            </div>
          )}
          {discIva && (
            <div className="flex justify-between border-b border-border py-1.5 text-xs text-ink-faint">
              <span>Neto / IVA</span>
              <span className="font-mono">
                {money(neto)} + {money(ivaMonto)}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 text-base font-bold">
            <span>{discIva ? "Total (Neto + IVA)" : "Total"}</span>
            <span className="font-mono">{money(total)}</span>
          </div>

          <button
            onClick={confirmarVenta}
            disabled={cart.length === 0 || confirming}
            className="mt-2 w-full rounded-lg bg-copper px-4 py-3 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
          >
            {confirming
              ? "Confirmando…"
              : condicionPago === "cta_cte" && !isNC
                ? "Confirmar venta (a cta. cte.)"
                : "Confirmar venta"}
          </button>
        </div>
      </div>

      {chequeModal && (
        <ChequeModal
          tipo={chequeModal.tipo}
          importe={total}
          titularDefault={isConsumidorFinal ? "" : (selectedCliente?.razonSocial ?? "")}
          onCancel={() => setChequeModal(null)}
          onConfirm={(data) => finalizarVenta(data)}
        />
      )}

      {printDoc && <ComprobantePrint doc={printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  );
}
