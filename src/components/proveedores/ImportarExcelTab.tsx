"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { codigosYMarcasExistentes, claveCodigoMarca } from "@/lib/articulos/search";
import { money } from "@/lib/format";
import { useImportJob, type FilaImportJob } from "@/lib/import/ImportJobContext";

interface FilaImport extends FilaImportJob {
  costoConDescuento: number;
  modelo: string;
  medida: string;
}

// El precio de venta se actualiza siempre (aunque no cambie) en los artículos
// ya existentes — nunca es opcional. Estos campos sí son opcionales, y la
// foto del artículo nunca se toca desde acá.
const CAMPOS = [
  { id: "descripcion", label: "Descripción" },
  { id: "marca", label: "Marca" },
  { id: "rubro", label: "Rubro" },
  { id: "costo", label: "Costo" },
  { id: "iva", label: "IVA" },
] as const;

function normalizarClave(k: string): string {
  return k
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

const ALIAS: Record<string, string[]> = {
  CODIGO: ["CODIGO"],
  DESCRIPCION: ["DESCRIPCION"],
  "COSTO CON DESCUENTO": ["COSTO CON DESCUENTO", "COSTO C/DESCUENTO", "COSTO CON DTO"],
  COSTO: ["COSTO"],
  MARCA: ["MARCA"],
  MODELO: ["MODELO"],
  MEDIDA: ["MEDIDA"],
  RUBRO: ["RUBRO"],
  "PRECIO VENTA": ["PRECIO VENTA", "PRECIO DE VENTA", "P VENTA", "P. VENTA"],
  IVA: ["IVA"],
};

// Orden fijo de columnas cuando el archivo viene sin fila de encabezado
// (como exporta el proveedor EXINTRADER): CODIGO, DESCRIPCION, COSTO CON
// DESCUENTO, COSTO, MARCA, MODELO, MEDIDA, RUBRO, PRECIO VENTA, IVA.
const ORDEN_POSICIONAL: (keyof typeof ALIAS)[] = [
  "CODIGO",
  "DESCRIPCION",
  "COSTO CON DESCUENTO",
  "COSTO",
  "MARCA",
  "MODELO",
  "MEDIDA",
  "RUBRO",
  "PRECIO VENTA",
  "IVA",
];

function buscarValor(fila: Record<string, unknown>, campo: keyof typeof ALIAS): unknown {
  const normalizados: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fila)) normalizados[normalizarClave(k)] = v;
  for (const alias of ALIAS[campo]) {
    if (alias in normalizados) return normalizados[alias];
  }
  return undefined;
}

const ALIAS_PLANOS = new Set(Object.values(ALIAS).flat());

// Si la primera fila trae al menos dos celdas que coinciden con nombres de
// columna conocidos, la tratamos como encabezado; si no (por ej. el archivo
// arranca directo con el código numérico del primer artículo), asumimos que
// no hay encabezado y usamos el orden fijo de columnas.
function tieneEncabezado(primeraFila: unknown[]): boolean {
  let coincidencias = 0;
  for (const celda of primeraFila) {
    if (typeof celda !== "string") continue;
    if (ALIAS_PLANOS.has(normalizarClave(celda))) coincidencias++;
  }
  return coincidencias >= 2;
}

export default function ImportarExcelTab() {
  const { iniciar } = useImportJob();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [columnasDetectadas, setColumnasDetectadas] = useState<string[]>([]);
  const [campos, setCampos] = useState<Set<string>>(new Set(CAMPOS.map((c) => c.id)));
  const [leyendo, setLeyendo] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState("");
  const [encolado, setEncolado] = useState(false);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState("Hoja1");
  const [modalHojaAbierto, setModalHojaAbierto] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setArchivo(file ?? null);
    setError("");
    setEncolado(false);
    setFilas([]);
    setColumnasDetectadas([]);
    setWorkbook(null);
  }

  function abrirSelectorDeHoja() {
    if (!archivo) {
      setError("Elegí primero un archivo .xlsx.");
      return;
    }
    setError("");
    setLeyendo(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setLeyendo(false);
      setError("No se pudo leer el archivo.");
    };
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        setLeyendo(false);
        setWorkbook(wb);
        setHojaSeleccionada(wb.SheetNames.includes("Hoja1") ? "Hoja1" : wb.SheetNames[0]);
        setModalHojaAbierto(true);
      } catch {
        setLeyendo(false);
        setError("No se pudo leer el archivo. Verificá que sea un .xlsx o .xls válido.");
      }
    };
    reader.readAsArrayBuffer(archivo);
  }

  async function procesarHojaSeleccionada() {
    if (!workbook) return;
    const sheet = workbook.Sheets[hojaSeleccionada];
    if (!sheet) {
      setError(`No se encontró la hoja "${hojaSeleccionada}" en el archivo.`);
      return;
    }

    const crudas: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const noVacias = crudas.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

    if (noVacias.length === 0) {
      setError(`La hoja "${hojaSeleccionada}" no tiene filas de datos.`);
      setModalHojaAbierto(false);
      return;
    }

    const conEncabezado = tieneEncabezado(noVacias[0]);
    let rows: Record<string, unknown>[];

    if (conEncabezado) {
      const headers = noVacias[0].map((h) => String(h ?? "").trim());
      rows = noVacias.slice(1).map((r) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
        return obj;
      });
      setColumnasDetectadas(headers);
    } else {
      rows = noVacias.map((r) => {
        const obj: Record<string, unknown> = {};
        ORDEN_POSICIONAL.forEach((campo, i) => (obj[campo] = r[i] ?? ""));
        return obj;
      });
      setColumnasDetectadas([`Sin fila de encabezado — se usó el orden fijo: ${ORDEN_POSICIONAL.join(", ")}`]);
    }

    const crudo = rows
      .map((r) => ({
        codigo: String(buscarValor(r, "CODIGO") ?? "").trim(),
        descripcion: String(buscarValor(r, "DESCRIPCION") ?? "").trim(),
        costoConDescuento: Number(buscarValor(r, "COSTO CON DESCUENTO")) || 0,
        costo: Number(buscarValor(r, "COSTO")) || 0,
        marca: String(buscarValor(r, "MARCA") ?? "").trim(),
        modelo: String(buscarValor(r, "MODELO") ?? "").trim(),
        medida: String(buscarValor(r, "MEDIDA") ?? "").trim(),
        rubro: String(buscarValor(r, "RUBRO") ?? "").trim(),
        precioVenta: Number(buscarValor(r, "PRECIO VENTA")) || 0,
        iva: Number(buscarValor(r, "IVA")) || 21,
      }))
      .filter((f) => f.codigo);

    if (crudo.length === 0) {
      setModalHojaAbierto(false);
      setError(
        conEncabezado
          ? `Se leyó la hoja "${hojaSeleccionada}" pero ninguna fila tiene código. Revisá que exista la columna CODIGO.`
          : `Se leyó la hoja "${hojaSeleccionada}" pero ninguna fila tiene código en la primera columna.`,
      );
      return;
    }

    // Solo se consultan en la base los códigos que trae este archivo (no el
    // catálogo entero), en tandas — así funciona igual de rápido con 100
    // filas que con 100.000 artículos ya cargados. Un código ya cargado con
    // otra marca no cuenta como "existente": se trata como artículo nuevo.
    setVerificando(true);
    const supabase = createClient();
    const existentes = await codigosYMarcasExistentes(supabase, crudo);
    setVerificando(false);

    const parsed: FilaImport[] = crudo.map((f) => ({
      ...f,
      existe: existentes.has(claveCodigoMarca(f.codigo, f.marca)),
    }));

    setModalHojaAbierto(false);
    setError("");
    setFilas(parsed);
  }

  function toggleCampo(id: string) {
    setCampos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmarImportacion() {
    iniciar(archivo?.name ?? "archivo", hojaSeleccionada, filas, campos);
    setEncolado(true);
    setFilas([]);
    setArchivo(null);
    setColumnasDetectadas([]);
  }

  return (
    <div>
      <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
        <p className="mb-2 text-sm text-ink-soft">
          Columnas esperadas (en cualquier orden, o sin encabezado en este orden fijo): <b>CODIGO,
          DESCRIPCION, COSTO CON DESCUENTO, COSTO, MARCA, MODELO, MEDIDA, RUBRO, PRECIO VENTA, IVA</b>.
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onFile}
            className="text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-soft"
          />
          <button
            onClick={abrirSelectorDeHoja}
            disabled={!archivo || leyendo}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-40"
          >
            {leyendo ? "Leyendo…" : "Cargar lista"}
          </button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        {columnasDetectadas.length > 0 && filas.length === 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            Columnas detectadas en el archivo: {columnasDetectadas.join(", ")}
          </p>
        )}
        {encolado && (
          <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
            La importación se está procesando en segundo plano — mirá el progreso abajo a la derecha.
            Podés seguir usando el sistema, e incluso cargar otra lista más, mientras tanto.
          </p>
        )}
      </div>

      {filas.length > 0 && (
        <>
          <div className="mb-4 rounded-[var(--radius-app)] border border-border bg-surface p-4">
            <p className="mb-1 text-sm font-semibold text-ink">¿Qué modificar en caso de artículos ya cargados?</p>
            <p className="mb-2 text-xs text-ink-faint">
              El precio de venta se actualiza siempre. La foto del artículo nunca se toca desde acá. Un
              código que ya existe pero con otra marca se carga como artículo nuevo, no pisa al existente.
            </p>
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
            className="rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark"
          >
            Confirmar importación ({filas.length} artículos)
          </button>
        </>
      )}

      {modalHojaAbierto && workbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-app)] border border-border bg-surface p-5 shadow-lg">
            <p className="mb-1 text-sm font-semibold text-ink">¿Qué hoja del Excel querés cargar?</p>
            <p className="mb-3 text-xs text-ink-faint">
              El archivo tiene {workbook.SheetNames.length} hoja(s). Por defecto se usa &quot;Hoja1&quot;.
            </p>
            <select
              value={hojaSeleccionada}
              onChange={(e) => setHojaSeleccionada(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper"
            >
              {workbook.SheetNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setModalHojaAbierto(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-sm text-ink-soft hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                onClick={procesarHojaSeleccionada}
                disabled={verificando}
                className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
              >
                {verificando ? "Verificando…" : "Cargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
