"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clienteFromRow, type Cliente, type ClienteRow } from "@/lib/clientes/types";
import NuevoClienteModal from "./NuevoClienteModal";
import ClienteFicha from "./ClienteFicha";

export default function ClientesView({ initialClientes }: { initialClientes: Cliente[] }) {
  const [clientes, setClientes] = useState(initialClientes);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialClientes[0]?.id ?? null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("clientes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as ClienteRow).id;
          setClientes((prev) => prev.filter((c) => c.id !== deletedId));
          return;
        }
        const row = clienteFromRow(payload.new as ClienteRow);
        setClientes((prev) => {
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
    return clientes
      .filter((c) => !q || c.razonSocial.toLowerCase().includes(q) || c.cuit.toLowerCase().includes(q))
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }, [clientes, search]);

  const selected = clientes.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col lg:sticky lg:top-[90px] lg:h-[calc(100vh-110px)]">
        <div className="mb-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-copper focus:ring-1 focus:ring-copper"
          />
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="mb-3 w-full rounded-lg bg-copper px-3 py-2 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          + Nuevo cliente
        </button>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-[var(--radius-app)] border border-border bg-surface p-1.5">
          {filtrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm transition ${
                c.id === selectedId ? "bg-copper-soft text-ink" : "hover:bg-bg text-ink-soft"
              }`}
            >
              <p className="font-medium text-ink">{c.razonSocial}</p>
              {c.cuit && <p className="text-xs text-ink-faint">{c.cuit}</p>}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-ink-faint">Sin resultados.</p>
          )}
        </div>
      </div>

      <div>
        {selected ? (
          <ClienteFicha
            cliente={selected}
            onUpdated={(c) => setClientes((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
            onDeleted={(id) => {
              setClientes((prev) => prev.filter((c) => c.id !== id));
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-[var(--radius-app)] border border-dashed border-border bg-surface py-20 text-sm text-ink-faint">
            Seleccioná un cliente de la lista.
          </div>
        )}
      </div>

      {showNew && (
        <NuevoClienteModal
          onClose={() => setShowNew(false)}
          onSaved={(c) => {
            setClientes((prev) => [...prev, c]);
            setSelectedId(c.id);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}
