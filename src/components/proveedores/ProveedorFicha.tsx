"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { totalFactura, type FacturaCompra, type Proveedor } from "@/lib/proveedores/types";
import RecepcionModal from "./RecepcionModal";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function ProveedorFicha({
  proveedor,
  facturas,
  onUpdated,
  onDeleted,
}: {
  proveedor: Proveedor;
  facturas: FacturaCompra[];
  onUpdated: (p: Proveedor) => void;
  onDeleted: (id: string) => void;
}) {
  const [razonSocial, setRazonSocial] = useState(proveedor.razonSocial);
  const [cuit, setCuit] = useState(proveedor.cuit);
  const [telefono, setTelefono] = useState(proveedor.telefono);
  const [direccion, setDireccion] = useState(proveedor.direccion);
  const [email, setEmail] = useState(proveedor.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recepcion, setRecepcion] = useState<{ facturaId: string } | null>(null);

  useEffect(() => {
    setRazonSocial(proveedor.razonSocial);
    setCuit(proveedor.cuit);
    setTelefono(proveedor.telefono);
    setDireccion(proveedor.direccion);
    setEmail(proveedor.email);
    setError("");
  }, [proveedor.id]);

  const facturasProveedor = facturas
    .filter((f) => f.proveedorId === proveedor.id)
    .sort((a, b) => b.fechaFactura.localeCompare(a.fechaFactura));
  const pendientes = facturasProveedor.filter((f) => !f.pagada);
  const totalPendiente = pendientes.reduce((s, f) => s + totalFactura(f), 0);
  const totalGeneral = facturasProveedor.reduce((s, f) => s + totalFactura(f), 0);

  async function guardar() {
    if (!razonSocial.trim()) return setError("La razón social es obligatoria.");
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("proveedores")
      .update({
        razon_social: razonSocial.trim(),
        cuit: cuit.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        email: email.trim(),
      })
      .eq("id", proveedor.id);
    setSaving(false);
    if (err) return setError("No se pudo guardar.");
    onUpdated({ ...proveedor, razonSocial, cuit, telefono, direccion, email });
  }

  async function eliminar() {
    if (facturasProveedor.length > 0) {
      return setError("No se puede eliminar: el proveedor tiene facturas cargadas.");
    }
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("proveedores").delete().eq("id", proveedor.id);
    if (err) return setError("No se pudo eliminar el proveedor.");
    onDeleted(proveedor.id);
  }

  return (
    <div className="rounded-[var(--radius-app)] border border-border bg-surface p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
        {proveedor.razonSocial}
      </h2>
      <p className="text-xs text-ink-faint">{proveedor.cuit || "Sin CUIT cargado"}</p>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="rounded-lg bg-warning-soft px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-warning">Facturas pendientes</p>
          <p className="mt-1 font-mono text-lg font-bold text-warning">{money(totalPendiente)}</p>
        </div>
        <div className="rounded-lg bg-bg px-4 py-3">
          <p className="text-[11px] font-semibold uppercase text-ink-faint">Total facturado</p>
          <p className="mt-1 font-mono text-lg font-bold text-ink">{money(totalGeneral)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
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
          <label className={LABEL}>Mail</label>
          <input className={FIELD} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <button
          onClick={guardar}
          disabled={saving}
          className="mt-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          onClick={eliminar}
          className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          Eliminar proveedor
        </button>
      </div>

      <div className="mt-6">
        <p className={LABEL}>Facturas de este proveedor</p>
        {facturasProveedor.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">Sin facturas cargadas.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {facturasProveedor.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {f.tipoComprobante} — {f.numero}
                  </p>
                  <p className="text-xs text-ink-faint">{f.fechaFactura}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono font-semibold">{money(totalFactura(f))}</p>
                    <span
                      className={`text-[11px] font-semibold ${f.pagada ? "text-success" : "text-warning"}`}
                    >
                      {f.pagada ? "Pagada" : "Pendiente"}
                    </span>
                  </div>
                  <button
                    onClick={() => setRecepcion({ facturaId: f.id })}
                    className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                  >
                    📦 Cargar artículos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recepcion && (
        <RecepcionModal facturaId={recepcion.facturaId} onClose={() => setRecepcion(null)} />
      )}
    </div>
  );
}
