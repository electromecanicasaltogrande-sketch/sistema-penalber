"use client";

import { useMemo, useState } from "react";
import type { FacturaCompra, Proveedor } from "@/lib/proveedores/types";
import ProveedorFicha from "./ProveedorFicha";

export default function ProveedoresDetalleTab({
  proveedores,
  facturas,
  onProveedorUpdated,
  onProveedorDeleted,
}: {
  proveedores: Proveedor[];
  facturas: FacturaCompra[];
  onProveedorUpdated: (p: Proveedor) => void;
  onProveedorDeleted: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(proveedores[0]?.id ?? null);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return proveedores
      .filter((p) => !q || p.razonSocial.toLowerCase().includes(q) || p.cuit.toLowerCase().includes(q))
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }, [proveedores, search]);

  const selected = proveedores.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col lg:sticky lg:top-[90px] lg:h-[calc(100vh-110px)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor…"
          className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-copper focus:ring-1 focus:ring-copper"
        />
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-[var(--radius-app)] border border-border bg-surface p-1.5">
          {filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm transition ${
                p.id === selectedId ? "bg-copper-soft text-ink" : "hover:bg-bg text-ink-soft"
              }`}
            >
              <p className="font-medium text-ink">{p.razonSocial}</p>
              {p.cuit && <p className="text-xs text-ink-faint">{p.cuit}</p>}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-ink-faint">Sin resultados.</p>
          )}
        </div>
      </div>

      <div>
        {selected ? (
          <ProveedorFicha
            proveedor={selected}
            facturas={facturas}
            onUpdated={onProveedorUpdated}
            onDeleted={(id) => {
              onProveedorDeleted(id);
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-[var(--radius-app)] border border-dashed border-border bg-surface py-20 text-sm text-ink-faint">
            Seleccioná un proveedor de la lista.
          </div>
        )}
      </div>
    </div>
  );
}
