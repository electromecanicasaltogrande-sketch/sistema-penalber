import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/getUsuarioActual";
import type { VentaRow } from "@/lib/ventas/historial";
import ReportesView from "@/components/reportes/ReportesView";

export default async function ReportesPage() {
  const supabase = await createClient();

  const [
    { user, perfil },
    { data: ventasData },
    { data: facturasData },
    { data: reparacionesData },
    { data: presTallerData },
  ] = await Promise.all([
    getUsuarioActual(),
    supabase
      .from("ventas")
      .select("id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en")
      .order("creado_en", { ascending: false })
      .limit(1000),
    supabase.from("facturas_compra").select("id, tipo_comprobante, neto, iva, otros_impuestos, fecha_factura").order("fecha_factura", { ascending: false }).limit(1000),
    supabase.from("reparaciones").select("id, total, entregada, creado_en").order("creado_en", { ascending: false }).limit(1000),
    supabase.from("presupuestos_taller").select("id, estado, cobro_no_hizo, creado_en").order("creado_en", { ascending: false }).limit(1000),
  ]);

  if (!user) redirect("/login");
  if (!perfil || perfil.rol !== "admin") redirect("/");

  return (
    <ReportesView
      ventas={(ventasData as VentaRow[]) ?? []}
      facturasCompra={facturasData ?? []}
      reparaciones={reparacionesData ?? []}
      presupuestosTaller={presTallerData ?? []}
    />
  );
}
