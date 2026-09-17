"use client";

import { useState } from "react";

export interface ChequeData {
  titular: string;
  fechaCobro: string;
  fechaVencimiento: string;
}

const FIELD =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";
const LABEL = "text-xs font-semibold text-ink-soft";

export default function ChequeModal({
  tipo,
  importe,
  titularDefault,
  onCancel,
  onConfirm,
}: {
  tipo: "cheque" | "echeq";
  importe: number;
  titularDefault: string;
  onCancel: () => void;
  onConfirm: (data: ChequeData) => void;
}) {
  const [titular, setTitular] = useState(titularDefault);
  const [fechaCobro, setFechaCobro] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [error, setError] = useState("");

  function confirmar() {
    if (!titular.trim()) return setError("Ingresá el titular del cheque.");
    if (!fechaCobro) return setError("Ingresá la fecha en que se puede cobrar.");
    if (!fechaVencimiento) return setError("Ingresá la fecha de vencimiento.");
    onConfirm({ titular: titular.trim(), fechaCobro, fechaVencimiento });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-sm rounded-[var(--radius-app)] border border-border bg-surface p-6 shadow-lg">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
          Datos del {tipo === "echeq" ? "eCheq" : "cheque"}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Importe</label>
            <input className={FIELD} value={importe.toFixed(2)} readOnly />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>De quién es (titular)</label>
            <input
              className={FIELD}
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Nombre del titular"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Fecha en que se puede cobrar</label>
            <input
              type="date"
              className={FIELD}
              value={fechaCobro}
              onChange={(e) => setFechaCobro(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Fecha de vencimiento</label>
            <input
              type="date"
              className={FIELD}
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={confirmar}
            className="flex-1 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark"
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
