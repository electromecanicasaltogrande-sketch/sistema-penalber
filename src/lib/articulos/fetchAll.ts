import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { fromRow, type Articulo, type ArticuloRow } from "./types";

export const COLUMNAS_ARTICULO =
  "id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo";

// Supabase/PostgREST devuelve como máximo 1000 filas por consulta salvo que
// se pagine con .range(): sin esto, cualquier local con más de 1000
// artículos perdía silenciosamente el resto (no aparecían en Ventas, no se
// detectaban como "ya existentes" al importar, etc.). Esta función trae la
// tabla completa en tandas de 1000.
const TAMANO_PAGINA = 1000;

export async function fetchTodosLosArticulos(
  supabase: SupabaseClient<Database>,
): Promise<Articulo[]> {
  const todas: ArticuloRow[] = [];
  let desde = 0;

  while (true) {
    const { data, error } = await supabase
      .from("articulos")
      .select(COLUMNAS_ARTICULO)
      .order("codigo")
      .range(desde, desde + TAMANO_PAGINA - 1);

    if (error || !data || data.length === 0) break;
    todas.push(...(data as unknown as ArticuloRow[]));
    if (data.length < TAMANO_PAGINA) break;
    desde += TAMANO_PAGINA;
  }

  return todas.map(fromRow);
}
