import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import { reparacionFromRow, type ReparacionRow } from "@/lib/taller/types";
import ReparacionesView from "@/components/taller/ReparacionesView";

export default async function ReparacionesPage() {
  const supabase = await createClient();
  const [{ data: clientesData }, { data: reparacionesData }] = await Promise.all([
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default"),
    supabase
      .from("reparaciones")
      .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, total, discrimina_iva, condicion_pago, entregada, creado_en")
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <Suspense>
      <ReparacionesView
        initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
        initialReparaciones={((reparacionesData as ReparacionRow[]) ?? []).map(reparacionFromRow)}
      />
    </Suspense>
  );
}
