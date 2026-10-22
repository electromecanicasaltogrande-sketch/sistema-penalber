"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Monta el contenido a imprimir directamente en <body>. Al imprimir, el CSS oculta todo lo demás
// (sidebar, listados, etc.) y así el documento no queda precedido ni seguido de hojas en blanco.
export default function PrintPortal({ children }: { children: ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return createPortal(<div className="print-only hidden print:block">{children}</div>, document.body);
}
