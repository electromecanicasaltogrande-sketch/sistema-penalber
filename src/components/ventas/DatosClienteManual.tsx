"use client";

import { useState } from "react";
import {
  CONDICIONES_IVA,
  TIPOS_DOC,
  validarDocumento,
  type DatosManuales,
  type TipoDoc,
} from "@/lib/clientes/documento";

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function DatosClienteManual({
  inicial,
  onAplicar,
  onCancelar,
}: {
  inicial: DatosManuales | null;
  onAplicar: (d: DatosManuales, guardarComoCliente: boolean) => Promise<string | void> | string | void;
  onCancelar: () => void;
}) {
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>(inicial?.tipoDoc ?? "CUIT");
  const [numero, setNumero] = useState(inicial?.numero ?? "");
  const [razonSocial, setRazonSocial] = useState(inicial?.razonSocial ?? "");
  const [domicilio, setDomicilio] = useState(inicial?.domicilio ?? "");
  const [localidad, setLocalidad] = useState(inicial?.localidad ?? "");
  const [condicionIva, setCondicionIva] = useState(inicial?.condicionIva ?? "responsable_inscripto");
  const [guardar, setGuardar] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function cambiarTipo(t: TipoDoc) {
    setTipoDoc(t);
    if (t === "CUIT") setCondicionIva("responsable_inscripto");
    else if (t === "DNI" || t === "SIN") setCondicionIva("consumidor_final");
  }

  async function aplicar() {
    setError("");
    if (!razonSocial.trim()) return setError("Ingresá la razón social o el nombre.");
    const errDoc = validarDocumento(tipoDoc, numero);
    if (errDoc) return setError(errDoc);
    setSaving(true);
    const res = await onAplicar(
      {
        tipoDoc,
        numero: numero.replace(/\D/g, ""),
        razonSocial: razonSocial.trim(),
        domicilio: domicilio.trim(),
        localidad: localidad.trim(),
        condicionIva,
      },
      guardar,
    );
    setSaving(false);
    if (typeof res === "string" && res) setError(res);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          Datos del cliente para la factura
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          Se usan solo en este comprobante, salvo que marques &quot;Guardar como cliente&quot;.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Tipo de documento</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_DOC.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => cambiarTipo(t.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    tipoDoc === t.id ? "border-copper bg-copper text-white" : "border-border bg-bg text-ink-soft hover:bg-surface"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {tipoDoc !== "SIN" && (
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Número (sin puntos ni guiones)</label>
              <input
                className={FIELD}
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/D/g, "").slice(0, 11))}
                placeholder={tipoDoc === "DNI" ? "Ej: 30123456" : "Ej: 20301234567"}
                inputMode="numeric"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className={LABEL}>Razón social / Nombre y apellido</label>
            <input className={FIELD} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL}>Condición frente al IVA</label>
            <div className="flex flex-wrap gap-1.5">
              {CONDICIONES_IVA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondicionIva(c.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    condicionIva === c.id ? "border-copper bg-copper text-white" : "border-border bg-bg text-ink-soft hover:bg-surface"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Domicilio</label>
              <input className={FIELD} value={domicilio} onChange={(e) => setDomicilio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Localidad</label>
              <input className={FIELD} value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
            Guardar como cliente (para próximas ventas y cuenta corriente)
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={aplicar}
            disabled={saving}
            className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Usar estos datos"}
          </button>
          <button
            onClick={onCancelar}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
