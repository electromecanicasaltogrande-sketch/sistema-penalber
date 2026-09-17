"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clienteFromRow, type Cliente } from "@/lib/clientes/types";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function NuevoClienteModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (c: Cliente) => void;
}) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!razonSocial.trim()) return setError("La razón social es obligatoria.");
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("clientes")
      .insert({
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        localidad: localidad.trim(),
      })
      .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default")
      .single();
    setSaving(false);
    if (err) return setError(err.message);
    onSaved(clienteFromRow(data));
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          Nuevo cliente
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Razón social</label>
            <input className={FIELD} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>CUIT / CUIL</label>
            <input className={FIELD} value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Teléfono</label>
            <input className={FIELD} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Dirección</label>
            <input className={FIELD} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Localidad</label>
            <input className={FIELD} value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
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
            className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar cliente"}
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
