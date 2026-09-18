import { createClient } from "@/lib/supabase/server";
import { buscarArticulosPaginado } from "@/lib/articulos/search";
import ArticulosView from "@/components/articulos/ArticulosView";

const TAMANO_PAGINA = 50;

export default async function ArticulosPage() {
  const supabase = await createClient();
  const { articulos, total } = await buscarArticulosPaginado(supabase, {}, 0, TAMANO_PAGINA);

  return <ArticulosView initialArticulos={articulos} initialTotal={total} />;
}
