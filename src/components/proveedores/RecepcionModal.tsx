"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarArticulosPorCodigos } from "@/lib/articulos/search";
import BuscadorArticulos from "@/components/articulos/BuscadorArticulos";

export default function RecepcionModal({ facturaId, onClose }: { facturaId: string; onClose: () => void }) {
  const [items, setItems] = useState<{ codigo: string; cantidad: number }[]>([]);
  const [saving, setSaving] = useState(false);

  function addItem(codigo: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.codigo === codigo);
      if (existing) return prev.map((i) => (i.codigo === codigo ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { codigo, cantidad: 1 }];
    });
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

        <div className="mt-3">
          <BuscadorArticulos onSelect={(a) => addItem(a.codigo)} mostrarPrecio="ninguno" mostrarStock={false} />
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
