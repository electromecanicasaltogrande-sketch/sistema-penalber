import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchTodosLosArticulos } from "@/lib/articulos/fetchAll";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import VentasView from "@/components/ventas/VentasView";

export default async function VentasPage() {
  const supabase = await createClient();
  const [articulos, { data: clientesData }] = await Promise.all([
    fetchTodosLosArticulos(supabase),
    supabase
      .from("clientes")
      .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default")
      .order("razon_social"),
  ]);

  const clientes = ((clientesData as ClienteRow[]) ?? []).map(clienteFromRow);

  return (
    <Suspense>
      <VentasView initialArticulos={articulos} initialClientes={clientes} />
    </Suspense>
  );
}
