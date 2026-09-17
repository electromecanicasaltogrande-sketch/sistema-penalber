import { createClient } from "@/lib/supabase/server";
import { proveedorFromRow, facturaFromRow, type ProveedorRow, type FacturaCompraRow } from "@/lib/proveedores/types";
import ProveedoresView from "@/components/proveedores/ProveedoresView";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const [{ data: proveedoresData }, { data: facturasData }] = await Promise.all([
    supabase.from("proveedores").select("id, razon_social, cuit, telefono, direccion, email").order("razon_social"),
    supabase
      .from("facturas_compra")
      .select(
        "id, proveedor_id, tipo_comprobante, empresa_cuit, punto_venta, numero, fecha_llegada, fecha_factura, neto, iva, otros_impuestos, pagada",
      )
      .order("fecha_factura", { ascending: false }),
  ]);

  return (
    <ProveedoresView
      initialProveedores={((proveedoresData as ProveedorRow[]) ?? []).map(proveedorFromRow)}
      initialFacturas={((facturasData as FacturaCompraRow[]) ?? []).map(facturaFromRow)}
    />
  );
}
