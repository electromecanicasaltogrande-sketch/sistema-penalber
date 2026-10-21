import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { traerClientes } from "@/lib/clientes/traerClientes";
import { reparacionFromRow, type ReparacionRow } from "@/lib/taller/types";
import ReparacionesView from "@/components/taller/ReparacionesView";

export default async function ReparacionesPage() {
  const supabase = await createClient();
  const [{ data: clientesData }, { data: reparacionesData }] = await Promise.all([
    traerClientes(supabase).then((data) => ({ data })),
    supabase
      .from("reparaciones")
      .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, total, discrimina_iva, condicion_pago, entregada, creado_en")
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <Suspense>
      <ReparacionesView
        initialClientes={clientesData}
        initialReparaciones={((reparacionesData as ReparacionRow[]) ?? []).map(reparacionFromRow)}
      />
    </Suspense>
  );
}
