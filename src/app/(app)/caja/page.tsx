import { createClient } from "@/lib/supabase/server";
import CajaView from "@/components/caja/CajaView";
import type { VentaRow } from "@/lib/ventas/historial";

export default async function CajaPage() {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("ventas")
    .select(
      "id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en",
    )
    .gte("creado_en", startOfDay.toISOString())
    .order("creado_en", { ascending: false });

  return <CajaView initialVentasHoy={(data as VentaRow[]) ?? []} />;
}
