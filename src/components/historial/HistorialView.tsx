"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { empresaCorta } from "@/lib/empresas";
import { buildComprobanteDoc, type VentaRow } from "@/lib/ventas/historial";
import ComprobantePrint, { type ComprobanteDocData } from "@/lib/ventas/print";

type TipoFiltro = "" | "factura" | "remito" | "nc";

const FIELD =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

export default function HistorialView({ initialVentas }: { initialVentas: VentaRow[] }) {
  const [ventas, setVentas] = useState(initialVentas);
  const [cliente, setCliente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState<TipoFiltro>("");
  const [printDoc, setPrintDoc] = useState<ComprobanteDocData | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ventas-historial-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventas" }, (payload) => {
        setVentas((prev) => [payload.new as VentaRow, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtradas = useMemo(() => {
    const q = cliente.toLowerCase();
    return ventas.filter((v) => {
      if (q && !v.cliente_nombre.toLowerCase().includes(q)) return false;
      if (desde && v.creado_en.slice(0, 10) < desde) return false;
      if (hasta && v.creado_en.slice(0, 10) > hasta) return false;
      if (tipo === "factura" && !v.doc_type.startsWith("factura")) return false;
      if (tipo === "remito" && v.doc_type !== "remito_r") return false;
      if (tipo === "nc" && !v.doc_type.startsWith("nc_")) return false;
      return true;
    });
  }, [ventas, cliente, desde, hasta, tipo]);

  async function verImprimir(v: VentaRow) {
    setPrintDoc(await buildComprobanteDoc(v));
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
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={FIELD} />
        <span className="text-xs text-ink-faint">a</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={FIELD} />
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
                  <button
                    onClick={() => verImprimir(v)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                  >
                    Ver / Reimprimir
                  </button>
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

      {printDoc && <ComprobantePrint doc={printDoc} onClose={() => setPrintDoc(null)} />}
    </div>
  );
}
