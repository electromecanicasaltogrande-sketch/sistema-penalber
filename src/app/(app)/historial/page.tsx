import { createClient } from "@/lib/supabase/server";
import HistorialView from "@/components/historial/HistorialView";
import type { VentaRow } from "@/lib/ventas/historial";
import type { Perfil } from "@/lib/auth/types";

export default async function HistorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id, nombre, rol")
      .eq("id", user.id)
      .single<Perfil>();
    isAdmin = perfil?.rol === "admin";
  }

  const { data } = await supabase
    .from("ventas")
    .select(
      "id, numero, tipo, doc_type, empresa_cuit, cliente_id, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en",
    )
    .order("creado_en", { ascending: false })
    .limit(300);

  return <HistorialView initialVentas={(data as VentaRow[]) ?? []} isAdmin={isAdmin} />;
}
