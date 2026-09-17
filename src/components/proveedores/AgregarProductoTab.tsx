"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fromRow, type Articulo, type ArticuloRow } from "@/lib/articulos/types";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function AgregarProductoTab({ onCreado }: { onCreado: (a: Articulo) => void }) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [rubro, setRubro] = useState("");
  const [costo, setCosto] = useState("");
  const [iva, setIva] = useState("21");
  const [minorista, setMinorista] = useState("");
  const [mayorista, setMayorista] = useState("");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  async function guardar() {
    setError("");
    setOk("");
    if (!codigo.trim() || !descripcion.trim()) return setError("Completá código y descripción.");
    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("articulos")
      .insert({
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        marca: marca.trim(),
        rubro: rubro.trim() || "Sin rubro",
        costo: Number(costo) || 0,
        iva: Number(iva) || 21,
        precio_minorista: Number(minorista) || 0,
        precio_mayorista: Number(mayorista) || 0,
        stock: Number(stock) || 0,
      })
      .select(
        "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo",
      )
      .single();
    setSaving(false);
    if (err || !data) return setError(err?.message.includes("codigo") ? "Ese código ya existe." : "No se pudo guardar.");
    onCreado(fromRow(data as ArticuloRow));
    setOk("Producto agregado — ya está disponible para vender.");
    setCodigo("");
    setDescripcion("");
    setMarca("");
    setRubro("");
    setCosto("");
    setMinorista("");
    setMayorista("");
    setStock("0");
  }

  return (
    <div className="max-w-lg rounded-[var(--radius-app)] border border-border bg-surface p-5">
      <p className="mb-3 text-sm text-ink-faint">
        Para dar de alta puntual un producto comprado a otro proveedor, para probar.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className={LABEL}>Código</label>
          <input className={FIELD} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className={LABEL}>Descripción</label>
          <input className={FIELD} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Marca</label>
          <input className={FIELD} value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Rubro</label>
          <input className={FIELD} value={rubro} onChange={(e) => setRubro(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Costo</label>
          <input type="number" className={FIELD} value={costo} onChange={(e) => setCosto(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>IVA %</label>
          <input type="number" className={FIELD} value={iva} onChange={(e) => setIva(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>P. Minorista</label>
          <input type="number" className={FIELD} value={minorista} onChange={(e) => setMinorista(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>P. Mayorista</label>
          <input type="number" className={FIELD} value={mayorista} onChange={(e) => setMayorista(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Stock</label>
          <input type="number" className={FIELD} value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
      {ok && <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">{ok}</p>}

      <button
        onClick={guardar}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Agregar producto"}
      </button>
    </div>
  );
}
