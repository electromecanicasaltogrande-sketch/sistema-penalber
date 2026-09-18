"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarArticulos } from "./search";
import type { Articulo } from "./types";

// Hook compartido por Ventas, Presupuestos, Reparaciones, Presupuestos
// Taller y Devoluciones: busca en la base a medida que se escribe (con
// debounce), en vez de filtrar un catálogo entero cargado en memoria.
export function useBuscadorArticulos(termino: string, limite = 8): Articulo[] {
  const [resultados, setResultados] = useState<Articulo[]>([]);

  useEffect(() => {
    const q = termino.trim();
    if (q.length < 2) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const encontrados = await buscarArticulos(supabase, q, limite);
      if (!cancelado) setResultados(encontrados);
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [termino, limite]);

  return resultados;
}
