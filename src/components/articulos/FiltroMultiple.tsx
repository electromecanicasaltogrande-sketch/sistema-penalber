"use client";

import { useEffect, useRef, useState } from "react";

export default function FiltroMultiple({
  label,
  opciones,
  seleccion,
  onToggle,
}: {
  label: string;
  opciones: string[];
  seleccion: string[];
  onToggle: (valor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-soft hover:bg-bg"
      >
        {seleccion.length === 0 ? `${label}: Todos` : `${label}: ${seleccion.length} seleccionado(s)`} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-md">
          {seleccion.length > 0 && (
            <button
              onClick={() => seleccion.forEach((v) => onToggle(v))}
              className="mb-1 w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-copper hover:bg-bg"
            >
              Limpiar selección
            </button>
          )}
          {opciones.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg">
              <input type="checkbox" checked={seleccion.includes(o)} onChange={() => onToggle(o)} />
              {o}
            </label>
          ))}
          {opciones.length === 0 && <p className="px-2 py-1.5 text-xs text-ink-faint">Sin {label.toLowerCase()} todavía</p>}
        </div>
      )}
    </div>
  );
}
