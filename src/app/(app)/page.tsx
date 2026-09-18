import { createClient } from "@/lib/supabase/server";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";
import type { VentaRow } from "@/lib/ventas/historial";
import DashboardView from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: ventasData }, { data: chequesData }] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en")
      .gte("creado_en", sevenDaysAgo.toISOString()),
    supabase
      .from("cheques")
      .select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado")
      .eq("cobrado", false)
      .order("fecha_vencimiento"),
  ]);

  return (
    <DashboardView
      ventas7dias={(ventasData as VentaRow[]) ?? []}
      cheques={((chequesData as ChequeRow[]) ?? []).map(chequeFromRow)}
    />
  );
}
