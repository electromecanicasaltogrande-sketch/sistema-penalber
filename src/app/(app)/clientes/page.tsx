import { createClient } from "@/lib/supabase/server";
import { traerClientes } from "@/lib/clientes/traerClientes";
import ClientesView from "@/components/clientes/ClientesView";

export default async function ClientesPage() {
  const supabase = await createClient();
  const clientes = await traerClientes(supabase);

  return <ClientesView initialClientes={clientes} />;
}
