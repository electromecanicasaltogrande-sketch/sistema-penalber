"use client";

import { useEffect, useState } from "react";
import FechaInput from "@/components/ui/FechaInput";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { empresaCorta } from "@/lib/empresas";
import { buildComprobanteDoc, eliminarVenta, type VentaRow } from "@/lib/ventas/historial";
import ComprobantePrint, { type ComprobanteDocData } from "@/lib/ventas/print";

type TipoFiltro = "" | "factura" | "remito" | "nc";

const PAGINA = 300;
const COLUMNAS =
  "id, numero, tipo, doc_type, empresa_cuit, cliente_id, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en, cliente_tipo_doc, cliente_domicilio, cliente_localidad, cliente_condicion_iva";

const FIELD =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

export default function HistorialView({
  initialVentas,
  isAdmin,
}: {
  initialVentas: VentaRow[];
  isAdmin: boolean;
}) {
  const [ventas, setVentas] = useState(initialVentas);
  const [cliente, setCliente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState<TipoFiltro>("");
  const [printDoc, setPrintDoc] = useState<ComprobanteDocData | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [hayMas, setHayMas] = useState(initialVentas.length >= PAGINA);
  const hayFiltros = !!(cliente.trim() || desde || hasta || tipo);

  // Los filtros se aplican en la base (no solo sobre las últimas filas ya
  // cargadas), así se puede buscar en todo el historial.
  async function cargar(desdeFila: number, reemplazar: boolean) {
    setCargando(true);
    const supabase = createClient();
    let q = supabase
      .from("ventas")
      .select(COLUMNAS)
      .order("creado_en", { ascending: false })
      .range(desdeFila, desdeFila + PAGINA - 1);
    if (cliente.trim()) q = q.ilike("cliente_nombre", `%${cliente.trim().replace(/[%_]/g, (m) => "\\" + m)}%`);
    if (desde) q = q.gte("creado_en", desde + "T00:00:00-03:00");
    if (hasta) q = q.lte("creado_en", hasta + "T23:59:59-03:00");
    if (tipo === "factura") q = q.in("doc_type", ["factura_a", "factura_b", "factura_c"]);
    if (tipo === "remito") q = q.eq("doc_type", "remito_r");
    if (tipo === "nc") q = q.in("doc_type", ["nc_a", "nc_b"]);
    const { data } = await q;
    const filas = (data as VentaRow[] | null) ?? [];
    setVentas((prev) => (reemplazar ? filas : [...prev, ...filas]));
    setHayMas(filas.length === PAGINA);
    setCargando(false);
  }

  useEffect(() => {
    if (!hayFiltros) {
      setVentas(initialVentas);
      setHayMas(initialVentas.length >= PAGINA);
      return;
    }
    const h = setTimeout(() => cargar(0, true), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, desde, hasta, tipo]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ventas-historial-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventas" }, (payload) => {
        setVentas((prev) => [payload.new as VentaRow, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "ventas" }, (payload) => {
        const id = (payload.old as { id: string }).id;
        setVentas((prev) => prev.filter((v) => v.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtradas = ventas;

  async function verImprimir(v: VentaRow) {
    setPrintDoc(await buildComprobanteDoc(v));
  }

  async function borrar(v: VentaRow) {
    const ok = window.confirm(
      `¿Eliminar ${v.numero} (${v.cliente_nombre}, ${money(v.total)})? Esto devuelve el stock y saca el monto de Caja, Dashboard y Reportes. No se puede deshacer.`,
    );
    if (!ok) return;
    setBorrando(v.id);
    try {
      await eliminarVenta(v);
      setVentas((prev) => prev.filter((x) => x.id !== v.id));
    } finally {
      setBorrando(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Buscar por cliente…"
          className={`${FIELD} min-w-[220px] flex-1`}
        />
        <FechaInput value={desde} onChange={setDesde} className={FIELD} />
        <span className="text-xs text-ink-faint">a</span>
        <FechaInput value={hasta} onChange={setHasta} className={FIELD} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoFiltro)} className={FIELD}>
          <option value="">Todos los tipos</option>
          <option value="factura">Facturas</option>
          <option value="remito">Remitos</option>
          <option value="nc">Notas de crédito</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Comprobante</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Condición</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-none">
                <td className="px-3 py-2.5">{new Date(v.creado_en).toLocaleDateString("es-AR")}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{v.numero}</td>
                <td className="px-3 py-2.5">{v.cliente_nombre}</td>
                <td className="px-3 py-2.5 text-xs text-ink-faint">{empresaCorta(v.empresa_cuit)}</td>
                <td className="px-3 py-2.5 text-xs capitalize">{v.condicion_pago.replace("_", " ")}</td>
                <td className="px-3 py-2.5 font-mono font-semibold">{money(v.total)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => verImprimir(v)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                    >
                      Ver / Reimprimir
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => borrar(v)}
                        disabled={borrando === v.id}
                        className="rounded-full border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
                      >
                        {borrando === v.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">
            No hay comprobantes que coincidan con el filtro.
          </p>
        )}
      </div>

      {hayMas && (
        <div className="mt-3 text-center">
          <button
            onClick={() => cargar(ventas.length, false)}
            disabled={cargando}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-bg disabled:opacity-50"
          >
            {cargando ? "Cargando…" : "Cargar más comprobantes"}
          </button>
        </div>
      )}

      {printDoc && <ComprobantePrint doc={printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  );
}
