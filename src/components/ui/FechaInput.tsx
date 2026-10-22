"use client";

import { useEffect, useState } from "react";

function isoATexto(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : "";
}

function formatear(digitos: string): string {
  if (digitos.length > 4) return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
  if (digitos.length > 2) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return digitos;
}

function textoAIso(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  if (d.length !== 6 && d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const anio = d.length === 6 ? 2000 + Number(d.slice(4)) : Number(d.slice(4));
  const f = new Date(anio, mes - 1, dia);
  if (f.getFullYear() !== anio || f.getMonth() !== mes - 1 || f.getDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Fecha corta: se escribe "221026" y se muestra "22/10/26" (las barras se ponen solas).
// `value` y `onChange` usan formato ISO (AAAA-MM-DD), igual que un input de tipo date.
export default function FechaInput({
  value,
  onChange,
  className = "",
  placeholder = "dd/mm/aa",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(isoATexto(value));

  useEffect(() => {
    if (value !== (textoAIso(texto) ?? "")) setTexto(isoATexto(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const incompleto = texto !== "" && textoAIso(texto) === null;

  return (
    <input
      value={texto}
      inputMode="numeric"
      placeholder={placeholder}
      maxLength={10}
      aria-invalid={incompleto}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
        const t = formatear(digitos);
        setTexto(t);
        onChange(textoAIso(t) ?? "");
      }}
      className={`${className} w-[110px] ${incompleto ? "!border-warning" : ""}`}
    />
  );
}
