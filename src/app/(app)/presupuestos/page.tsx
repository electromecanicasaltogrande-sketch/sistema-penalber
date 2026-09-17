import { createClient } from "@/lib/supabase/server";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { configFromRow, presupuestoFromRow, type PresupuestoConfigRow, type PresupuestoVentaRow } from "@/lib/presupuestos/types";
import PresupuestosView from "@/components/presupuestos/PresupuestosView";

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const [{ data: clientesData }, { data: articulosData }, { data: configData }, { data: presupuestosData }] =
    await Promise.all([
      supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default").order("razon_social"),
      supabase
        .from("articulos")
        .select("id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo")
        .order("codigo"),
      supabase.from("presupuesto_config").select("texto_intro, observaciones, dias_validez, firma, mostrar_empresa").single(),
      supabase
        .from("presupuestos_venta")
        .select("id, numero, cliente_id, cliente_nombre, lista_precio, subtotal, estado, creado_en")
        .order("creado_en", { ascending: false }),
    ]);

  return (
    <PresupuestosView
      initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
      initialArticulos={((articulosData as ArticuloRow[]) ?? []).map(fromRow)}
      initialConfig={configFromRow(configData as PresupuestoConfigRow)}
      initialPresupuestos={((presupuestosData as PresupuestoVentaRow[]) ?? []).map(presupuestoFromRow)}
    />
  );
}
