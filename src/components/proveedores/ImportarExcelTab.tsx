"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import type { Articulo } from "@/lib/articulos/types";

interface FilaImport {
  codigo: string;
  descripcion: string;
  costoConDescuento: number;
  costo: number;
  marca: string;
  modelo: string;
  medida: string;
  rubro: string;
  precioVenta: number;
  iva: number;
  existe: boolean;
}

const CAMPOS = [
  { id: "descripcion", label: "Descripción" },
  { id: "marca", label: "Marca" },
  { id: "rubro", label: "Rubro" },
  { id: "costo", label: "Costo" },
  { id: "iva", label: "IVA" },
  { id: "precioVenta", label: "Precio de venta" },
] as const;

export default function ImportarExcelTab({
  articulos,
  onImportado,
}: {
  articulos: Articulo[];
  onImportado: () => void;
}) {
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [campos, setCampos] = useState<Set<string>>(new Set(CAMPOS.map((c) => c.id)));
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<{ nuevos: number; actualizados: number } | null>(null);
  const [error, setError] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const codigosExistentes = new Set(articulos.map((a) => a.codigo.toLowerCase()));
        const parsed: FilaImport[] = rows.map((r) => {
          const codigo = String(r["CODIGO"] ?? "").trim();
          return {
            codigo,
            descripcion: String(r["DESCRIPCION"] ?? "").trim(),
            costoConDescuento: Number(r["COSTO CON DESCUENTO"]) || 0,
            costo: Number(r["COSTO"]) || 0,
            marca: String(r["MARCA"] ?? "").trim(),
            modelo: String(r["MODELO"] ?? "").trim(),
            medida: String(r["MEDIDA"] ?? "").trim(),
            rubro: String(r["RUBRO"] ?? "").trim(),
            precioVenta: Number(r["PRECIO VENTA"]) || 0,
            iva: Number(r["IVA"]) || 21,
            existe: codigosExistentes.has(codigo.toLowerCase()),
          };
        }).filter((f) => f.codigo);
        setFilas(parsed);
      } catch {
        setError("No se pudo leer el archivo. Verificá que sea un .xlsx válido con las columnas esperadas.");
      }
    };
    reader.readAsBinaryString(file);
  }

  function toggleCampo(id: string) {
    setCampos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmarImportacion() {
    setImporting(true);
    const supabase = createClient();
    let nuevos = 0;
    let actualizados = 0;

    for (const f of filas) {
      if (f.existe) {
        const patch: Record<string, unknown> = {};
        if (campos.has("descripcion")) patch.descripcion = f.descripcion;
        if (campos.has("marca")) patch.marca = f.marca;
        if (campos.has("rubro")) patch.rubro = f.rubro;
        if (campos.has("costo")) patch.costo = f.costo;
        if (campos.has("iva")) patch.iva = f.iva;
        if (campos.has("precioVenta")) patch.precio_minorista = f.precioVenta;
        if (Object.keys(patch).length > 0) {
          await supabase.from("articulos").update(patch).ilike("codigo", f.codigo);
        }
        actualizados++;
      } else {
        await supabase.from("articulos").insert({
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
        nuevos++;
      }
    }

    setImporting(false);
    setResultado({ nuevos, actualizados });
    setFilas([]);
    onImportado();
  }

  return (
    <div>
      <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <p className="mb-2 text-sm text-ink-soft">
          Columnas esperadas, en este orden: <b>CODIGO, DESCRIPCION, COSTO CON DESCUENTO, COSTO, MARCA,
          MODELO, MEDIDA, RUBRO, PRECIO VENTA, IVA</b>.
        </p>
        <input type="file" accept=".xlsx,.xls" onChange={onFile} className="text-sm" />
        {error && <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        {resultado && (
          <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
            Importación completa: {resultado.nuevos} nuevos, {resultado.actualizados} actualizados.
          </p>
        )}
      </div>

      {filas.length > 0 && (
        <>
          <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-semibold text-ink">¿Qué modificar en caso de artículos ya cargados?</p>
            <div className="mb-2 flex gap-3 text-xs">
              <button onClick={() => setCampos(new Set(CAMPOS.map((c) => c.id)))} className="font-semibold text-copper hover:underline">
                Seleccionar todos
              </button>
              <button onClick={() => setCampos(new Set())} className="font-semibold text-ink-faint hover:underline">
                Ninguno
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              {CAMPOS.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <input type="checkbox" checked={campos.has(c.id)} onChange={() => toggleCampo(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4 max-h-96 overflow-auto rounded-[var(--radius-app)] border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                  <th className="px-2.5 py-2">Código</th>
                  <th className="px-2.5 py-2">Descripción</th>
                  <th className="px-2.5 py-2">Marca</th>
                  <th className="px-2.5 py-2">Rubro</th>
                  <th className="px-2.5 py-2">Costo c/desc.</th>
                  <th className="px-2.5 py-2">Costo</th>
                  <th className="px-2.5 py-2">P. Venta</th>
                  <th className="px-2.5 py-2">IVA</th>
                  <th className="px-2.5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-border last:border-none">
                    <td className="px-2.5 py-2 font-mono text-xs">{f.codigo}</td>
                    <td className="px-2.5 py-2">{f.descripcion}</td>
                    <td className="px-2.5 py-2">{f.marca}</td>
                    <td className="px-2.5 py-2">{f.rubro}</td>
                    <td className="px-2.5 py-2 font-mono text-xs">{money(f.costoConDescuento)}</td>
                    <td className="px-2.5 py-2 font-mono text-xs">{money(f.costo)}</td>
                    <td className="px-2.5 py-2 font-mono text-xs">{money(f.precioVenta)}</td>
                    <td className="px-2.5 py-2 font-mono text-xs">{f.iva}%</td>
                    <td className="px-2.5 py-2 text-xs">{f.existe ? "🔁 Actualiza" : "✅ Nuevo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={confirmarImportacion}
            disabled={importing}
            className="rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
          >
            {importing ? "Importando…" : `Confirmar importación (${filas.length} artículos)`}
          </button>
        </>
      )}
    </div>
  );
}
