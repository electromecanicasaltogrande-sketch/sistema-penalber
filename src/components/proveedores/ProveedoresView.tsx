"use client";

import { useState } from "react";
import type { FacturaCompra, Proveedor } from "@/lib/proveedores/types";
import FacturasCompraTab from "./FacturasCompraTab";
import ReportePagosTab from "./ReportePagosTab";
import AgregarProductoTab from "./AgregarProductoTab";
import ImportarExcelTab from "./ImportarExcelTab";
import ProveedoresDetalleTab from "./ProveedoresDetalleTab";

type Tab = "proveedores" | "facturas" | "reporte" | "agregar" | "importar";

export default function ProveedoresView({
  initialProveedores,
  initialFacturas,
}: {
  initialProveedores: Proveedor[];
  initialFacturas: FacturaCompra[];
}) {
  const [tab, setTab] = useState<Tab>("proveedores");
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [facturas, setFacturas] = useState(initialFacturas);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {(
          [
            ["proveedores", "Proveedores"],
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

      {tab === "proveedores" && (
        <ProveedoresDetalleTab
          proveedores={proveedores}
          facturas={facturas}
          onProveedorUpdated={(p) => setProveedores((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
          onProveedorDeleted={(id) => setProveedores((prev) => prev.filter((x) => x.id !== id))}
        />
      )}
      {tab === "facturas" && (
        <FacturasCompraTab
          proveedores={proveedores}
          facturas={facturas}
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
      {tab === "agregar" && <AgregarProductoTab onCreado={() => {}} />}
      {tab === "importar" && <ImportarExcelTab />}
    </div>
  );
}
