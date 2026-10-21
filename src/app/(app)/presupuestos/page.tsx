import { createClient } from "@/lib/supabase/server";
import { traerClientes } from "@/lib/clientes/traerClientes";
import { traerTodo } from "@/lib/supabase/traerTodo";
import { configFromRow, presupuestoFromRow, type PresupuestoConfigRow, type PresupuestoVentaRow } from "@/lib/presupuestos/types";
import PresupuestosView from "@/components/presupuestos/PresupuestosView";

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const [clientes, { data: configData }, presupuestosData] = await Promise.all([
    traerClientes(supabase),
    supabase.from("presupuesto_config").select("texto_intro, observaciones, dias_validez, firma, mostrar_empresa").single(),
    traerTodo<PresupuestoVentaRow>((d, h) =>
      supabase
        .from("presupuestos_venta")
        .select("id, numero, cliente_id, cliente_nombre, lista_precio, subtotal, estado, creado_en")
        .order("creado_en", { ascending: false })
        .order("id")
        .range(d, h),
    ),
  ]);

  return (
    <PresupuestosView
      initialClientes={clientes}
      initialConfig={configFromRow(configData as PresupuestoConfigRow)}
      initialPresupuestos={presupuestosData.map(presupuestoFromRow)}
    />
  );
}
