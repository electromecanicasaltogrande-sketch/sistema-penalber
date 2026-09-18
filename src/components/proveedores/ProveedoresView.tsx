"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchTodosLosArticulos } from "@/lib/articulos/fetchAll";
import type { Articulo } from "@/lib/articulos/types";
import type { FacturaCompra, Proveedor } from "@/lib/proveedores/types";
import { useImportJob } from "@/lib/import/ImportJobContext";
import FacturasCompraTab from "./FacturasCompraTab";
import ReportePagosTab from "./ReportePagosTab";
import AgregarProductoTab from "./AgregarProductoTab";
import ImportarExcelTab from "./ImportarExcelTab";

type Tab = "facturas" | "reporte" | "agregar" | "importar";

function fetchArticulos(): Promise<Articulo[]> {
  return fetchTodosLosArticulos(createClient());
}

export default function ProveedoresView({
  initialProveedores,
  initialFacturas,
}: {
  initialProveedores: Proveedor[];
  initialFacturas: FacturaCompra[];
}) {
  const { jobs } = useImportJob();
  const [tab, setTab] = useState<Tab>("facturas");
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [facturas, setFacturas] = useState(initialFacturas);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const idsActivosRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    fetchArticulos().then(setArticulos);
  }, []);

  // Pueden correr varias importaciones en simultáneo; cada vez que una
  // termina, refresca la lista de artículos que usa la pestaña de importar
  // para detectar duplicados en las que sigan corriendo.
  useEffect(() => {
    let terminoAlguna = false;
    for (const j of jobs) {
      if (j.activo) {
        idsActivosRef.current.add(j.id);
      } else if (idsActivosRef.current.has(j.id)) {
        idsActivosRef.current.delete(j.id);
        terminoAlguna = true;
      }
    }
    if (terminoAlguna) fetchArticulos().then(setArticulos);
  }, [jobs]);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {(
          [
            ["facturas", "Facturas de compra"],
            ["reporte", "Reporte / Pagos"],
            ["agregar", "Agregar producto"],
            ["importar", "Importar Excel"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === id ? "border-copper text-ink" : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "facturas" && (
        <FacturasCompraTab
          proveedores={proveedores}
          facturas={facturas}
          articulos={articulos}
          onProveedorCreado={(p) => setProveedores((prev) => [...prev, p])}
          onFacturaCreada={(f) => setFacturas((prev) => [f, ...prev])}
        />
      )}
      {tab === "reporte" && (
        <ReportePagosTab
          proveedores={proveedores}
          facturas={facturas}
          onFacturaUpdated={(f) => setFacturas((prev) => prev.map((x) => (x.id === f.id ? f : x)))}
        />
      )}
      {tab === "agregar" && (
        <AgregarProductoTab onCreado={(a) => setArticulos((prev) => [...prev, a])} />
      )}
      {tab === "importar" && <ImportarExcelTab articulos={articulos} />}
    </div>
  );
}
