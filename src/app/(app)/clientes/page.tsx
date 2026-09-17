import { createClient } from "@/lib/supabase/server";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import ClientesView from "@/components/clientes/ClientesView";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default")
    .order("razon_social");

  const clientes = ((data as ClienteRow[]) ?? []).map(clienteFromRow);

  return <ClientesView initialClientes={clientes} />;
}
