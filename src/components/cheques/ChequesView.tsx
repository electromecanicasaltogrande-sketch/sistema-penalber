"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { chequeFromRow, diasHasta, estadoCheque, type Cheque, type ChequeRow } from "@/lib/cheques/types";

const ESTADO_CLASSES: Record<string, string> = {
  cobrado: "bg-bg text-ink-faint line-through",
  vencido: "bg-danger-soft text-danger",
  por_vencer: "bg-warning-soft text-warning",
  pendiente: "bg-bg text-ink-soft",
  ok: "bg-success-soft text-success",
};

const ESTADO_LABEL: Record<string, string> = {
  cobrado: "Cobrado",
  vencido: "Vencido",
  por_vencer: "Vence pronto",
  pendiente: "Pendiente",
  ok: "Se puede cobrar",
};

export default function ChequesView({ initialCheques }: { initialCheques: Cheque[] }) {
  const [cheques, setCheques] = useState(initialCheques);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cheques-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cheques" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as ChequeRow).id;
          setCheques((prev) => prev.filter((c) => c.id !== id));
          return;
        }
        const row = chequeFromRow(payload.new as ChequeRow);
        setCheques((prev) => {
          const exists = prev.some((c) => c.id === row.id);
          return exists ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return cheques
      .filter((c) => !q || c.titular.toLowerCase().includes(q))
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  }, [cheques, search]);

  async function toggleCobrado(c: Cheque) {
    const supabase = createClient();
    await supabase.from("cheques").update({ cobrado: !c.cobrado }).eq("id", c.id);
    setCheques((prev) => prev.map((x) => (x.id === c.id ? { ...x, cobrado: !x.cobrado } : x)));
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por titular…"
        className="mb-4 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-copper focus:ring-1 focus:ring-copper"
      />

      <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2">Titular</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Importe</th>
              <th className="px-3 py-2">Se puede cobrar</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const estado = estadoCheque(c);
              const diasCobro = diasHasta(c.fechaCobro);
              const diasVto = diasHasta(c.fechaVencimiento);
              return (
                <tr key={c.id} className="border-b border-border last:border-none">
                  <td className="px-3 py-2.5 font-medium">{c.titular}</td>
                  <td className="px-3 py-2.5 text-xs uppercase text-ink-faint">{c.tipo}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{money(c.importe)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.fechaCobro} ({diasCobro >= 0 ? `en ${diasCobro}d` : `hace ${-diasCobro}d`})
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.fechaVencimiento} ({diasVto >= 0 ? `en ${diasVto}d` : `hace ${-diasVto}d`})
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-faint">
                    {c.origen} {c.origenNumero ?? ""}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLASSES[estado]}`}
                    >
                      {ESTADO_LABEL[estado]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleCobrado(c)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                    >
                      {c.cobrado ? "Deshacer" : "Cobrado"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">No hay cheques cargados.</p>
        )}
      </div>
    </div>
  );
}
