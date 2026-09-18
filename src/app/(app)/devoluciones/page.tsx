import { createClient } from "@/lib/supabase/server";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import DevolucionesView from "@/components/devoluciones/DevolucionesView";

export default async function DevolucionesPage() {
  const supabase = await createClient();
  const [{ data: clientesData }, { data: devData }] = await Promise.all([
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default").order("razon_social"),
    supabase
      .from("devoluciones")
      .select("id, cliente_nombre, condicion, es_cambio, articulo_dev_desc, cantidad_dev, diferencia, creado_en")
      .order("creado_en", { ascending: false })
      .limit(200),
  ]);

  return (
    <DevolucionesView
      initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
      initialDevoluciones={devData ?? []}
    />
  );
}
