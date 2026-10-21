import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { traerClientes } from "@/lib/clientes/traerClientes";
import VentasView from "@/components/ventas/VentasView";

export default async function VentasPage() {
  const supabase = await createClient();
  const clientes = await traerClientes(supabase);

  return (
    <Suspense>
      <VentasView initialClientes={clientes} />
    </Suspense>
  );
}
