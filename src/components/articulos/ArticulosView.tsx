"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buscarArticulosPaginado,
  listarMarcasDistintas,
  listarRubrosDistintos,
} from "@/lib/articulos/search";
import { money } from "@/lib/format";
import { stockClass, type Articulo } from "@/lib/articulos/types";
import ArticuloModal from "./ArticuloModal";
import FiltroMultiple from "./FiltroMultiple";

type SortField = "codigo" | "stock";

const STOCK_CLASSES: Record<ReturnType<typeof stockClass>, string> = {
  low: "bg-danger-soft text-danger",
  mid: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
};

const TAMANO_PAGINA = 50;

export default function ArticulosView({
  initialArticulos,
  initialTotal,
}: {
  initialArticulos: Articulo[];
  initialTotal: number;
}) {
  const [articulos, setArticulos] = useState(initialArticulos);
  const [total, setTotal] = useState(initialTotal);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRubros, setSelectedRubros] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [rubrosDisponibles, setRubrosDisponibles] = useState<string[]>([]);
  const [marcasDisponibles, setMarcasDisponibles] = useState<string[]>([]);

  const [sortField, setSortField] = useState<SortField>("codigo");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [selected, setSelected] = useState<string[]>([]);
  const [selectedDetalle, setSelectedDetalle] = useState<Record<string, Articulo>>({});
  const [modal, setModal] = useState<{ mode: "new" } | { mode: "edit"; articulo: Articulo } | null>(
    null,
  );
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // Con 50-100 mil artículos, cargar y filtrar todo en el navegador es
  // inviable: se busca y pagina del lado del servidor (ver
  // src/lib/articulos/search.ts y la migración 0013 con los índices
  // trigram que hacen esto rápido).
  async function cargarPagina() {
    setCargando(true);
    const supabase = createClient();
    const { articulos: pagina_, total: total_ } = await buscarArticulosPaginado(
      supabase,
      { texto: search, rubros: selectedRubros, marcas: selectedMarcas },
      pagina,
      TAMANO_PAGINA,
      { campo: sortField, ascendente: sortDir === 1 },
    );
    setArticulos(pagina_);
    setTotal(total_);
    setCargando(false);
  }

  const esPrimerRenderRef = useRef(true);
  useEffect(() => {
    if (esPrimerRenderRef.current) {
      esPrimerRenderRef.current = false;
      return;
    }
    const t = setTimeout(cargarPagina, search ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedRubros, selectedMarcas, pagina, sortField, sortDir]);

  useEffect(() => {
    setPagina(0);
  }, [search, selectedRubros, selectedMarcas]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([listarRubrosDistintos(supabase), listarMarcasDistintas(supabase)]).then(
      ([rubros, marcas]) => {
        setRubrosDisponibles(rubros);
        setMarcasDisponibles(marcas);
      },
    );
  }, []);

  // Cualquier alta/edición/baja (desde esta pestaña o desde otra —
  // importación, otra caja, etc.) refresca la página actual en vez de
  // intentar parchear en memoria una lista paginada/filtrada. Un solo canal
  // para toda la vida del componente; siempre llama a la versión más
  // reciente de cargarPagina (con los filtros/página actuales) vía ref.
  const cargarPaginaRef = useRef(cargarPagina);
  cargarPaginaRef.current = cargarPagina;

  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("articulos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "articulos" }, () => {
        clearTimeout(t);
        t = setTimeout(() => cargarPaginaRef.current(), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!printing) return;
    const after = () => setPrinting(false);
    window.addEventListener("afterprint", after);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [printing]);

  function toggleSort(field: SortField) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir(1);
    } else {
      setSortDir((d) => (d === 1 ? -1 : 1));
    }
  }

  function toggleRubro(r: string) {
    setSelectedRubros((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function toggleMarca(m: string) {
    setSelectedMarcas((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function toggleSelect(a: Articulo, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, a.codigo] : prev.filter((c) => c !== a.codigo)));
    setSelectedDetalle((prev) => {
      if (checked) return { ...prev, [a.codigo]: a };
      const next = { ...prev };
      delete next[a.codigo];
      return next;
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    const visibles = articulos.map((a) => a.codigo);
    setSelected((prev) =>
      checked ? [...new Set([...prev, ...visibles])] : prev.filter((c) => !visibles.includes(c)),
    );
    setSelectedDetalle((prev) => {
      const next = { ...prev };
      if (checked) {
        for (const a of articulos) next[a.codigo] = a;
      } else {
        for (const a of articulos) delete next[a.codigo];
      }
      return next;
    });
  }

  const selectedItems = Object.values(selectedDetalle);
  const allVisibleSelected = articulos.length > 0 && articulos.every((a) => selected.includes(a.codigo));
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, descripción, marca o rubro…"
          className="min-w-[260px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper"
        />

        <FiltroMultiple label="Marcas" opciones={marcasDisponibles} seleccion={selectedMarcas} onToggle={toggleMarca} />
        <FiltroMultiple label="Rubros" opciones={rubrosDisponibles} seleccion={selectedRubros} onToggle={toggleRubro} />

        <button
          disabled={selected.length === 0}
          onClick={() => setPrinting(true)}
          className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-soft hover:bg-bg disabled:opacity-40"
        >
          🖨 Imprimir seleccionados ({selected.length})
        </button>

        <button
          onClick={() => setModal({ mode: "new" })}
          className="rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          + Nuevo artículo
        </button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-app)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
              <th className="px-2.5 py-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} />
              </th>
              <th className="px-2.5 py-2"></th>
              <th className="cursor-pointer px-2.5 py-2" onClick={() => toggleSort("codigo")}>
                Código {sortField === "codigo" ? (sortDir === 1 ? "▲" : "▼") : ""}
              </th>
              <th className="px-2.5 py-2">Descripción</th>
              <th className="px-2.5 py-2">Marca</th>
              <th className="px-2.5 py-2">Rubro</th>
              <th className="px-2.5 py-2">P. Minorista</th>
              <th className="px-2.5 py-2">P. Mayorista</th>
              <th className="px-2.5 py-2">IVA</th>
              <th className="px-2.5 py-2">Cód. Barras</th>
              <th className="cursor-pointer px-2.5 py-2" onClick={() => toggleSort("stock")}>
                Stock {sortField === "stock" ? (sortDir === 1 ? "▲" : "▼") : ""}
              </th>
              <th className="px-2.5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {articulos.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-none">
                <td className="px-2.5 py-2.5">
                  <input type="checkbox" checked={selected.includes(a.codigo)} onChange={(e) => toggleSelect(a, e.target.checked)} />
                </td>
                <td className="px-2.5 py-2.5">
                  {a.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.fotoUrl}
                      alt=""
                      onClick={() => setZoomed(a.fotoUrl)}
                      className="h-8 w-8 cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-md border border-dashed border-border bg-bg" />
                  )}
                </td>
                <td className="px-2.5 py-2.5 font-mono text-xs font-semibold">{a.codigo}</td>
                <td className="px-2.5 py-2.5">{a.descripcion}</td>
                <td className="px-2.5 py-2.5">{a.marca}</td>
                <td className="px-2.5 py-2.5">{a.rubro}</td>
                <td className="px-2.5 py-2.5 font-mono text-xs">{money(a.precioMinorista)}</td>
                <td className="px-2.5 py-2.5 font-mono text-xs">{money(a.precioMayorista)}</td>
                <td className="px-2.5 py-2.5 font-mono text-xs">{a.iva}%</td>
                <td className={`px-2.5 py-2.5 font-mono text-xs ${a.codigoBarras ? "text-ink" : "text-ink-faint"}`}>
                  {a.codigoBarras || "— sin cargar —"}
                </td>
                <td className="px-2.5 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STOCK_CLASSES[stockClass(a)]}`}>
                    {a.stock} u.
                  </span>
                </td>
                <td className="px-2.5 py-2.5">
                  <button
                    onClick={() => setModal({ mode: "edit", articulo: a })}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-bg"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && articulos.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">No hay artículos que coincidan con la búsqueda.</p>
        )}
        {cargando && <p className="px-4 py-10 text-center text-sm text-ink-faint">Buscando…</p>}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-faint">
        <span>{total.toLocaleString("es-AR")} artículos en total</span>
        <div className="flex items-center gap-2.5">
          <button
            disabled={pagina === 0}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-border px-3 py-1.5 font-medium text-ink-soft hover:bg-bg disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button
            disabled={pagina + 1 >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium text-ink-soft hover:bg-bg disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {modal?.mode === "new" && (
        <ArticuloModal
          mode="new"
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            cargarPagina();
          }}
        />
      )}
      {modal?.mode === "edit" && (
        <ArticuloModal
          mode="edit"
          articulo={modal.articulo}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            cargarPagina();
          }}
        />
      )}

      {zoomed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={() => setZoomed(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomed} alt="" className="max-h-[85vh] max-w-[85vw] rounded-lg" />
        </div>
      )}

      {printing && (
        <div className="print-only fixed inset-0 z-50 hidden bg-white p-8 print:block">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold">Listado de artículos</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-1.5">Código</th>
                <th className="py-1.5">Marca</th>
                <th className="py-1.5">Rubro</th>
                <th className="py-1.5 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((a) => (
                <tr key={a.id} className="border-b border-black/10">
                  <td className="py-1.5">{a.codigo}</td>
                  <td className="py-1.5">{a.marca}</td>
                  <td className="py-1.5">{a.rubro}</td>
                  <td className="py-1.5 text-right">{a.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
