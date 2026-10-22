import { createClient } from "@/lib/supabase/server";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";
import { traerTodo } from "@/lib/supabase/traerTodo";
import DashboardView, { type VentaDash } from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const desde = new Date();
  desde.setDate(desde.getDate() - 35);
  desde.setHours(0, 0, 0, 0);

  const [ventas, { data: chequesData }] = await Promise.all([
    traerTodo<VentaDash>((d, h) =>
      supabase
        .from("ventas")
        .select("creado_en, total, doc_type, condicion_pago, cliente_nombre, empresa_cuit")
        .gte("creado_en", desde.toISOString())
        .order("creado_en", { ascending: false })
        .order("id")
        .range(d, h) as unknown as PromiseLike<{ data: VentaDash[] | null }>,
    ),
    supabase
      .from("cheques")
      .select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado")
      .eq("cobrado", false)
      .order("fecha_vencimiento"),
  ]);

  return <DashboardView ventas={ventas} cheques={((chequesData as ChequeRow[]) ?? []).map(chequeFromRow)} />;
}
