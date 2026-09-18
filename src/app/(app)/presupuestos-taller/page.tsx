import { createClient } from "@/lib/supabase/server";
import { fetchTodosLosArticulos } from "@/lib/articulos/fetchAll";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import { presupuestoTallerFromRow, type PresupuestoTallerRow } from "@/lib/taller/types";
import PresupuestosTallerView from "@/components/taller/PresupuestosTallerView";

export default async function PresupuestosTallerPage() {
  const supabase = await createClient();
  const [articulos, { data: clientesData }, { data: presData }] = await Promise.all([
    fetchTodosLosArticulos(supabase),
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default"),
    supabase
      .from("presupuestos_taller")
      .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, discrimina_iva, estado, cobro_no_hizo, creado_en")
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <PresupuestosTallerView
      initialArticulos={articulos}
      initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
      initialPresupuestos={((presData as PresupuestoTallerRow[]) ?? []).map(presupuestoTallerFromRow)}
    />
  );
}
