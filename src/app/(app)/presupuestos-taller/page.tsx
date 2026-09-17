import { createClient } from "@/lib/supabase/server";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import { presupuestoTallerFromRow, type PresupuestoTallerRow } from "@/lib/taller/types";
import PresupuestosTallerView from "@/components/taller/PresupuestosTallerView";

export default async function PresupuestosTallerPage() {
  const supabase = await createClient();
  const [{ data: articulosData }, { data: clientesData }, { data: presData }] = await Promise.all([
    supabase
      .from("articulos")
      .select("id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo")
      .order("codigo"),
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final"),
    supabase
      .from("presupuestos_taller")
      .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, discrimina_iva, estado, cobro_no_hizo, creado_en")
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <PresupuestosTallerView
      initialArticulos={((articulosData as ArticuloRow[]) ?? []).map(fromRow)}
      initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
      initialPresupuestos={((presData as PresupuestoTallerRow[]) ?? []).map(presupuestoTallerFromRow)}
    />
  );
}
