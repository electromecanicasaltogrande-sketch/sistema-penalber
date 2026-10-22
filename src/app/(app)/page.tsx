import { createClient } from "@/lib/supabase/server";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";
import { traerTodo } from "@/lib/supabase/traerTodo";
import DashboardView, { type VentaDash, type FacturaPendienteDash } from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const desde = new Date();
  desde.setDate(desde.getDate() - 62);
  desde.setHours(0, 0, 0, 0);

  const [ventas, { data: chequesData }, { data: facturasData }, { data: provData }] = await Promise.all([
    traerTodo<VentaDash>((d, h) =>
      supabase
        .from("ventas")
        .select("creado_en, total, doc_type, condicion_pago, cliente_nombre, empresa_cuit")
        .gte("creado_en", desde.toISOString())
        .order("creado_en", { ascending: false })
        .order("id")
        .range(d, h) as unknown as PromiseLike<{ data: VentaDash[] | null }>,
    ),
    supabase
      .from("cheques")
      .select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado")
      .eq("cobrado", false)
      .order("fecha_vencimiento"),
    supabase
      .from("facturas_compra")
      .select("proveedor_id, neto, iva, otros_impuestos, fecha_factura")
      .eq("pagada", false)
      .limit(1000),
    supabase.from("proveedores").select("id, razon_social"),
  ]);

  const nombres = new Map(((provData as { id: string; razon_social: string }[] | null) ?? []).map((p) => [p.id, p.razon_social]));
  const pendientesProv: FacturaPendienteDash[] = (
    (facturasData as { proveedor_id: string; neto: number; iva: number; otros_impuestos: number; fecha_factura: string }[] | null) ?? []
  ).map((f) => ({
    proveedor: nombres.get(f.proveedor_id) ?? "—",
    total: Number(f.neto) + Number(f.iva) + Number(f.otros_impuestos),
    fecha: f.fecha_factura,
  }));

  return (
    <DashboardView
      ventas={ventas}
      cheques={((chequesData as ChequeRow[]) ?? []).map(chequeFromRow)}
      facturasProveedores={pendientesProv}
    />
  );
}
