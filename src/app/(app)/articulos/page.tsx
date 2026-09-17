import { createClient } from "@/lib/supabase/server";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import ArticulosView from "@/components/articulos/ArticulosView";

export default async function ArticulosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articulos")
    .select(
      "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo",
    )
    .order("codigo");

  const articulos = ((data as ArticuloRow[]) ?? []).map(fromRow);

  return <ArticulosView initialArticulos={articulos} />;
}
