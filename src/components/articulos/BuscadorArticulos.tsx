"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buscarArticuloExacto,
  buscarArticulosAvanzado,
  listarMarcasDistintas,
  listarRubrosDistintos,
} from "@/lib/articulos/search";
import { money } from "@/lib/format";
import type { Articulo } from "@/lib/articulos/types";
import FiltroMultiple from "./FiltroMultiple";

const FIELD_BASE =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper";

// Buscador de artículos compartido por Ventas, Presupuestos, Reparaciones,
// Presupuestos Taller, Devoluciones y la recepción de Facturas de compra:
// código y descripción son campos separados (para no mezclar resultados
// cuando el código buscado también aparece como substring en otra
// descripción) más filtros de marca y rubro, igual que en Artículos y
// Stock.
export default function BuscadorArticulos({
  onSelect,
  autoFocus,
  mostrarStock = true,
  mostrarPrecio = "minorista",
}: {
  onSelect: (a: Articulo) => void;
  autoFocus?: boolean;
  mostrarStock?: boolean;
  mostrarPrecio?: "minorista" | "mayorista" | "ninguno";
}) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [rubros, setRubros] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [rubrosDisponibles, setRubrosDisponibles] = useState<string[]>([]);
  const [marcasDisponibles, setMarcasDisponibles] = useState<string[]>([]);
  const [resultados, setResultados] = useState<Articulo[]>([]);
  const codigoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([listarRubrosDistintos(supabase), listarMarcasDistintas(supabase)]).then(
      ([r, m]) => {
        setRubrosDisponibles(r);
        setMarcasDisponibles(m);
      },
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const supabase = createClient();
      const encontrados = await buscarArticulosAvanzado(supabase, { codigo, descripcion, rubros, marcas });
      setResultados(encontrados);
    }, 250);
    return () => clearTimeout(t);
  }, [codigo, descripcion, rubros, marcas]);

  function toggleRubro(r: string) {
    setRubros((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  function toggleMarca(m: string) {
    setMarcas((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function seleccionar(a: Articulo) {
    onSelect(a);
    setCodigo("");
    setDescripcion("");
    setResultados([]);
    codigoRef.current?.focus();
  }

  // Pensado para el lector de código de barras: escanea, aprieta Enter (o
  // el lector lo simula) y agrega directo sin tener que tocar el mouse.
  async function agregarPorEnter() {
    if (codigo.trim()) {
      const supabase = createClient();
      const exacto = await buscarArticuloExacto(supabase, codigo.trim());
      if (exacto) return seleccionar(exacto);
    }
    if (resultados.length === 1) return seleccionar(resultados[0]);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          ref={codigoRef}
          autoFocus={autoFocus}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregarPorEnter()}
          placeholder="Buscar por código…"
          className={FIELD_BASE}
        />
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregarPorEnter()}
          placeholder="Buscar por descripción…"
          className={FIELD_BASE}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <FiltroMultiple label="Marcas" opciones={marcasDisponibles} seleccion={marcas} onToggle={toggleMarca} />
        <FiltroMultiple label="Rubros" opciones={rubrosDisponibles} seleccion={rubros} onToggle={toggleRubro} />
      </div>

      {resultados.length > 0 && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface shadow-sm">
          {resultados.map((a) => (
            <button
              key={a.id}
              onClick={() => seleccionar(a)}
              className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-none hover:bg-bg"
            >
              <div>
                <p>{a.descripcion}</p>
                <p className="font-mono text-xs text-ink-faint">
                  {a.codigo} · {a.marca || "—"} {a.rubro ? `· ${a.rubro}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {mostrarPrecio !== "ninguno" && (
                  <p className="font-mono font-semibold">
                    {money(mostrarPrecio === "mayorista" ? a.precioMayorista : a.precioMinorista)}
                  </p>
                )}
                {mostrarStock && <p className="text-xs text-ink-faint">{a.stock} u.</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
