"use client";

import { useState } from "react";
import type { FacturaCompra, Proveedor } from "@/lib/proveedores/types";
import FacturasCompraTab from "./FacturasCompraTab";
import ReportePagosTab from "./ReportePagosTab";
import AgregarProductoTab from "./AgregarProductoTab";
import ImportarExcelTab from "./ImportarExcelTab";

type Tab = "facturas" | "reporte" | "agregar" | "importar";

export default function ProveedoresView({
  initialProveedores,
  initialFacturas,
}: {
  initialProveedores: Proveedor[];
  initialFacturas: FacturaCompra[];
}) {
  const [tab, setTab] = useState<Tab>("facturas");
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [facturas, setFacturas] = useState(initialFacturas);

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
