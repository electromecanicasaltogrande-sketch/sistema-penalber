import { createClient } from "@/lib/supabase/server";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import VentasView from "@/components/ventas/VentasView";

export default async function VentasPage() {
  const supabase = await createClient();
  const [{ data: articulosData }, { data: clientesData }] = await Promise.all([
    supabase
      .from("articulos")
      .select(
        "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo",
      )
      .order("codigo"),
    supabase
      .from("clientes")
      .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final")
      .order("razon_social"),
  ]);

  const articulos = ((articulosData as ArticuloRow[]) ?? []).map(fromRow);
  const clientes = ((clientesData as ClienteRow[]) ?? []).map(clienteFromRow);

  return <VentasView initialArticulos={articulos} initialClientes={clientes} />;
}
