"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Articulo } from "@/lib/articulos/types";

interface Props {
  mode: "new" | "edit";
  articulo?: Articulo;
  onClose: () => void;
  onSaved: (a: Articulo) => void;
}

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function ArticuloModal({ mode, articulo, onClose, onSaved }: Props) {
  const [codigo, setCodigo] = useState(articulo?.codigo ?? "");
  const [descripcion, setDescripcion] = useState(articulo?.descripcion ?? "");
  const [marca, setMarca] = useState(articulo?.marca ?? "");
  const [rubro, setRubro] = useState(articulo?.rubro ?? "");
  const [costo, setCosto] = useState(String(articulo?.costo ?? ""));
  const [iva, setIva] = useState(String(articulo?.iva ?? 21));
  const [minorista, setMinorista] = useState(String(articulo?.precioMinorista ?? ""));
  const [mayorista, setMayorista] = useState(String(articulo?.precioMayorista ?? ""));
  const [stock, setStock] = useState(String(articulo?.stock ?? 0));
  const [barcode, setBarcode] = useState(articulo?.codigoBarras ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(articulo?.fotoUrl ?? null);
  const [fotoRemoved, setFotoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit") {
      const t = setTimeout(() => barcodeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [mode]);

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoRemoved(false);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeFoto() {
    setFotoFile(null);
    setFotoRemoved(true);
    setFotoPreview(null);
  }

  async function save() {
    setError("");
    if (!codigo.trim()) return setError("El código es obligatorio.");
    if (!descripcion.trim()) return setError("La descripción es obligatoria.");

    setSaving(true);
    const supabase = createClient();

    try {
      let fotoUrl = articulo?.fotoUrl ?? null;
      if (fotoRemoved) fotoUrl = null;
      if (fotoFile) {
        const ext = fotoFile.name.split(".").pop() || "jpg";
        const path = `${codigo.trim()}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("articulos-fotos")
          .upload(path, fotoFile, { upsert: true });
        if (upErr) throw upErr;
        fotoUrl = supabase.storage.from("articulos-fotos").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        marca: marca.trim(),
        rubro: rubro.trim() || "Sin rubro",
        costo: Number(costo) || 0,
        iva: Number(iva) || 21,
        precio_minorista: Number(minorista) || 0,
        precio_mayorista: Number(mayorista) || 0,
        stock: Number(stock) || 0,
        codigo_barras: barcode.trim() || null,
        foto_url: fotoUrl,
      };

      if (mode === "new") {
        const { data, error: insErr } = await supabase
          .from("articulos")
          .insert(payload)
          .select(
            "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo",
          )
          .single();
        if (insErr) throw insErr;
        const { fromRow } = await import("@/lib/articulos/types");
        onSaved(fromRow(data));
      } else {
        const { data, error: updErr } = await supabase
          .from("articulos")
          .update(payload)
          .eq("id", articulo!.id)
          .select(
            "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo",
          )
          .single();
        if (updErr) throw updErr;
        const { fromRow } = await import("@/lib/articulos/types");
        onSaved(fromRow(data));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      if (msg.includes("codigo_barras")) {
        setError("Ese código de barras ya está usado en otro artículo.");
      } else if (msg.includes("codigo")) {
        setError("Ese código ya existe.");
      } else {
        setError(msg);
      }
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-lg rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          {mode === "new" ? "Nuevo artículo" : "Editar artículo"}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className={LABEL}>Código</label>
            <input
              className={FIELD}
              value={codigo}
              disabled={mode === "edit"}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: ALT-095B"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className={LABEL}>Descripción</label>
            <input
              className={FIELD}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Alternador Bosch 95A"
            />
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
            <input
              type="number"
              className={FIELD}
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>IVA %</label>
            <input
              type="number"
              className={FIELD}
              value={iva}
              onChange={(e) => setIva(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>P. Minorista</label>
            <input
              type="number"
              className={FIELD}
              value={minorista}
              onChange={(e) => setMinorista(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>P. Mayorista</label>
            <input
              type="number"
              className={FIELD}
              value={mayorista}
              onChange={(e) => setMayorista(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Stock</label>
            <input
              type="number"
              className={FIELD}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className={LABEL}>Código de barras (opcional)</label>
            <input
              ref={barcodeRef}
              className={FIELD}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Escaneá o escribí el código de barras…"
            />
            {mode === "edit" && (
              <p className="text-[11px] text-ink-faint">
                Poné el cursor acá y escaneá con el lector — se completa solo.
              </p>
            )}
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={LABEL}>Foto (opcional)</label>
            <input type="file" accept="image/*" onChange={onFotoChange} className="text-xs" />
            {fotoPreview && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreview}
                  alt=""
                  className="mt-1 h-[100px] w-[100px] rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={removeFoto}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-soft hover:border-danger hover:text-danger"
                >
                  Quitar foto
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-copper-dark disabled:opacity-60"
          >
            {saving ? "Guardando…" : mode === "new" ? "Guardar artículo" : "Guardar cambios"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
