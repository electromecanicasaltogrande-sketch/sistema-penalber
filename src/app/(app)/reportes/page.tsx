import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/auth/types";
import type { VentaRow } from "@/lib/ventas/historial";
import ReportesView from "@/components/reportes/ReportesView";

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single<Perfil>();

  if (!perfil || perfil.rol !== "admin") redirect("/");

  const [{ data: ventasData }, { data: facturasData }, { data: reparacionesData }, { data: presTallerData }] =
    await Promise.all([
      supabase
        .from("ventas")
        .select("id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en")
        .order("creado_en", { ascending: false })
        .limit(1000),
      supabase.from("facturas_compra").select("id, tipo_comprobante, neto, iva, otros_impuestos, fecha_factura").order("fecha_factura", { ascending: false }).limit(1000),
      supabase.from("reparaciones").select("id, total, entregada, creado_en").order("creado_en", { ascending: false }).limit(1000),
      supabase.from("presupuestos_taller").select("id, estado, cobro_no_hizo, creado_en").order("creado_en", { ascending: false }).limit(1000),
    ]);

  return (
    <ReportesView
      ventas={(ventasData as VentaRow[]) ?? []}
      facturasCompra={facturasData ?? []}
      reparaciones={reparacionesData ?? []}
      presupuestosTaller={presTallerData ?? []}
    />
  );
}
