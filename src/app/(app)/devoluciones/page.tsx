import { createClient } from "@/lib/supabase/server";
import { traerClientes } from "@/lib/clientes/traerClientes";
import DevolucionesView from "@/components/devoluciones/DevolucionesView";

export default async function DevolucionesPage() {
  const supabase = await createClient();
  const [{ data: clientesData }, { data: devData }] = await Promise.all([
    traerClientes(supabase).then((data) => ({ data })),
    supabase
      .from("devoluciones")
      .select("id, cliente_nombre, condicion, es_cambio, articulo_dev_desc, cantidad_dev, diferencia, creado_en")
      .order("creado_en", { ascending: false })
      .limit(200),
  ]);

  return (
    <DevolucionesView
      initialClientes={clientesData}
      initialDevoluciones={devData ?? []}
    />
  );
}
