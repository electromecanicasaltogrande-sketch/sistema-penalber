import { createClient } from "@/lib/supabase/server";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import DevolucionesView from "@/components/devoluciones/DevolucionesView";

export default async function DevolucionesPage() {
  const supabase = await createClient();
  const [{ data: articulosData }, { data: clientesData }, { data: devData }] = await Promise.all([
    supabase
      .from("articulos")
      .select("id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo")
      .order("codigo"),
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default").order("razon_social"),
    supabase
      .from("devoluciones")
      .select("id, cliente_nombre, condicion, es_cambio, articulo_dev_desc, cantidad_dev, diferencia, creado_en")
      .order("creado_en", { ascending: false })
      .limit(200),
  ]);

  return (
    <DevolucionesView
      initialArticulos={((articulosData as ArticuloRow[]) ?? []).map(fromRow)}
      initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
      initialDevoluciones={devData ?? []}
    />
  );
}
