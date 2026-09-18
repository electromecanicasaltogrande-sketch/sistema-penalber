import { createClient } from "@/lib/supabase/server";
import { fetchTodosLosArticulos } from "@/lib/articulos/fetchAll";
import ArticulosView from "@/components/articulos/ArticulosView";

export default async function ArticulosPage() {
  const supabase = await createClient();
  const articulos = await fetchTodosLosArticulos(supabase);

  return <ArticulosView initialArticulos={articulos} />;
}
