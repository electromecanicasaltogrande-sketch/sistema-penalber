import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import VentasView from "@/components/ventas/VentasView";

export default async function VentasPage() {
  const supabase = await createClient();
  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default")
    .order("razon_social");

  const clientes = ((clientesData as ClienteRow[]) ?? []).map(clienteFromRow);

  return (
    <Suspense>
      <VentasView initialClientes={clientes} />
    </Suspense>
  );
}
