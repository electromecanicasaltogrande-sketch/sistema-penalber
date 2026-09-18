"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { articleMatches } from "@/lib/search";
import { money } from "@/lib/format";
import { fromRow, stockClass, type Articulo, type ArticuloRow } from "@/lib/articulos/types";
import ArticuloModal from "./ArticuloModal";

type SortField = "codigo" | "stock" | null;

const STOCK_CLASSES: Record<ReturnType<typeof stockClass>, string> = {
  low: "bg-danger-soft text-danger",
  mid: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
};

export default function ArticulosView({ initialArticulos }: { initialArticulos: Articulo[] }) {
  const [articulos, setArticulos] = useState(initialArticulos);
  const [search, setSearch] = useState("");
  const [selectedRubros, setSelectedRubros] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<{ mode: "new" } | { mode: "edit"; articulo: Articulo } | null>(
    null,
  );
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("articulos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "articulos" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setArticulos((prev) => prev.filter((a) => a.id !== (payload.old as ArticuloRow).id));
            return;
          }
          const updated = fromRow(payload.new as ArticuloRow);
          setArticulos((prev) => {
            const exists = prev.some((a) => a.id === updated.id);
            return exists
              ? prev.map((a) => (a.id === updated.id ? updated : a))
              : [...prev, updated];
          });
        },
      )
      .subscribe();
    return () => {
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

  const rubros = useMemo(
    () => [...new Set(articulos.map((a) => a.rubro))].sort(),
    [articulos],
  );
  const marcas = useMemo(
    () => [...new Set(articulos.map((a) => a.marca).filter(Boolean))].sort(),
    [articulos],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = articulos.filter((a) => {
      const matchQ = !q || articleMatches(a, q);
      const matchR = selectedRubros.length === 0 || selectedRubros.includes(a.rubro);
      const matchM = selectedMarcas.length === 0 || selectedMarcas.includes(a.marca);
      return matchQ && matchR && matchM;
    });
    if (sortField === "codigo") {
      list = [...list].sort(
        (a, b) => sortDir * a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
      );
    } else if (sortField === "stock") {
      list = [...list].sort((a, b) => sortDir * (a.stock - b.stock));
    }
    return list;
  }, [articulos, search, selectedRubros, selectedMarcas, sortField, sortDir]);

  function toggleSort(field: "codigo" | "stock") {
    if (sortField !== field) {
      setSortField(field);
      setSortDir(1);
    } else if (sortDir === 1) {
      setSortDir(-1);
    } else {
      setSortField(null);
    }
  }

  function toggleRubro(r: string) {
    setSelectedRubros((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function toggleMarca(m: string) {
    setSelectedMarcas((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function toggleSelect(codigo: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, codigo] : prev.filter((c) => c !== codigo)));
  }

  function toggleSelectAll(checked: boolean) {
    const visible = filtered.map((a) => a.codigo);
    setSelected((prev) =>
      checked
        ? [...new Set([...prev, ...visible])]
        : prev.filter((c) => !visible.includes(c)),
    );
  }

  const selectedItems = articulos.filter((a) => selected.includes(a.codigo));
  const allVisibleSelected = filtered.length > 0 && filtered.every((a) => selected.includes(a.codigo));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, descripción, marca o rubro…"
          className="min-w-[260px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper"
        />

        <FiltroMultiple
          label="Marcas"
          opciones={marcas}
          seleccion={selectedMarcas}
          onToggle={toggleMarca}
        />

        <FiltroMultiple
          label="Rubros"
          opciones={rubros}
          seleccion={selectedRubros}
          onToggle={toggleRubro}
        />

        <button
          disabled={selected.length === 0}
          onClick={() => setPrinting(true)}
          className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink-soft hover:bg-bg disabled:opacity-40"
        >
          🖨 Imprimir seleccionados
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
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
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
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-none">
                <td className="px-2.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.codigo)}
                    onChange={(e) => toggleSelect(a.codigo, e.target.checked)}
                  />
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
                <td
                  className={`px-2.5 py-2.5 font-mono text-xs ${a.codigoBarras ? "text-ink" : "text-ink-faint"}`}
                >
                  {a.codigoBarras || "— sin cargar —"}
                </td>
                <td className="px-2.5 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STOCK_CLASSES[stockClass(a)]}`}
                  >
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
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">
            No hay artículos que coincidan con la búsqueda.
          </p>
        )}
      </div>

      {modal?.mode === "new" && (
        <ArticuloModal
          mode="new"
          onClose={() => setModal(null)}
          onSaved={(a) => {
            setArticulos((prev) => [...prev, a]);
            setModal(null);
          }}
        />
      )}
      {modal?.mode === "edit" && (
        <ArticuloModal
          mode="edit"
          articulo={modal.articulo}
          onClose={() => setModal(null)}
          onSaved={(a) => {
            setArticulos((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setModal(null);
          }}
        />
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoomed(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomed} alt="" className="max-h-[85vh] max-w-[85vw] rounded-lg" />
        </div>
      )}

      {printing && (
        <div className="print-only fixed inset-0 z-50 hidden bg-white p-8 print:block">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold">
            Listado de artículos
          </h2>
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

function FiltroMultiple({
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
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg"
            >
              <input type="checkbox" checked={seleccion.includes(o)} onChange={() => onToggle(o)} />
              {o}
            </label>
          ))}
          {opciones.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-ink-faint">Sin {label.toLowerCase()} todavía</p>
          )}
        </div>
      )}
    </div>
  );
}
