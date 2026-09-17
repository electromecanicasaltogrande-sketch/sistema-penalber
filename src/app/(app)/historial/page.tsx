import { createClient } from "@/lib/supabase/server";
import HistorialView from "@/components/historial/HistorialView";
import type { VentaRow } from "@/lib/ventas/historial";

export default async function HistorialPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas")
    .select(
      "id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en",
    )
    .order("creado_en", { ascending: false })
    .limit(300);

  return <HistorialView initialVentas={(data as VentaRow[]) ?? []} />;
}
