"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface FilaImportJob {
  codigo: string;
  descripcion: string;
  marca: string;
  rubro: string;
  costo: number;
  iva: number;
  precioVenta: number;
  existe: boolean;
}

interface ImportJobState {
  id: number;
  archivo: string;
  hoja: string;
  activo: boolean;
  total: number;
  hecho: number;
  nuevos: number;
  actualizados: number;
  errores: number;
}

interface ImportJobContextValue {
  job: ImportJobState | null;
  iniciar: (archivoNombre: string, hoja: string, filas: FilaImportJob[], campos: Set<string>) => void;
}

const ImportJobContext = createContext<ImportJobContextValue | null>(null);

// Cada tantas filas se actualiza el estado visible, para no forzar un
// re-render en cada fila cuando la lista tiene miles de artículos.
const CADA_N_FILAS = 10;

export function ImportJobProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<ImportJobState | null>(null);
  const runningRef = useRef(false);
  const idRef = useRef(0);

  const iniciar = useCallback(
    (archivoNombre: string, hoja: string, filas: FilaImportJob[], campos: Set<string>) => {
      if (runningRef.current) return;
      runningRef.current = true;
      const id = ++idRef.current;
      setJob({
        id,
        archivo: archivoNombre,
        hoja,
        activo: true,
        total: filas.length,
        hecho: 0,
        nuevos: 0,
        actualizados: 0,
        errores: 0,
      });

      (async () => {
        const supabase = createClient();
        let nuevos = 0;
        let actualizados = 0;
        let errores = 0;

        for (let i = 0; i < filas.length; i++) {
          const f = filas[i];
          try {
            if (f.existe) {
              const patch: Record<string, unknown> = { precio_minorista: f.precioVenta };
              if (campos.has("descripcion")) patch.descripcion = f.descripcion;
              if (campos.has("marca")) patch.marca = f.marca;
              if (campos.has("rubro")) patch.rubro = f.rubro;
              if (campos.has("costo")) patch.costo = f.costo;
              if (campos.has("iva")) patch.iva = f.iva;
              const { error } = await supabase.from("articulos").update(patch).ilike("codigo", f.codigo);
              if (error) errores++;
              else actualizados++;
            } else {
              const { error } = await supabase.from("articulos").insert({
                codigo: f.codigo,
                descripcion: f.descripcion,
                marca: f.marca,
                rubro: f.rubro || "Sin rubro",
                costo: f.costo,
                iva: f.iva,
                precio_minorista: f.precioVenta,
                precio_mayorista: Math.round(f.precioVenta * 0.85),
                stock: 0,
                stock_minimo: 5,
              });
              if (error) errores++;
              else nuevos++;
            }
          } catch {
            errores++;
          }

          const esUltima = i === filas.length - 1;
          if (esUltima || i % CADA_N_FILAS === 0) {
            setJob((prev) =>
              prev && prev.id === id
                ? { ...prev, hecho: i + 1, nuevos, actualizados, errores }
                : prev,
            );
          }
        }

        setJob((prev) => (prev && prev.id === id ? { ...prev, activo: false } : prev));
        runningRef.current = false;
      })();
    },
    [],
  );

  return <ImportJobContext.Provider value={{ job, iniciar }}>{children}</ImportJobContext.Provider>;
}

export function useImportJob() {
  const ctx = useContext(ImportJobContext);
  if (!ctx) throw new Error("useImportJob debe usarse dentro de ImportJobProvider");
  return ctx;
}
