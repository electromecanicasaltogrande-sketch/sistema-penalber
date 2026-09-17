import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { clienteFromRow, type ClienteRow } from "@/lib/clientes/types";
import { reparacionFromRow, type ReparacionRow } from "@/lib/taller/types";
import ReparacionesView from "@/components/taller/ReparacionesView";

export default async function ReparacionesPage() {
  const supabase = await createClient();
  const [{ data: articulosData }, { data: clientesData }, { data: reparacionesData }] = await Promise.all([
    supabase
      .from("articulos")
      .select("id, codigo, descripcion, marca, rubro, costo, precio_minorista, precio_mayorista, iva, codigo_barras, foto_url, stock, stock_minimo")
      .order("codigo"),
    supabase.from("clientes").select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final"),
    supabase
      .from("reparaciones")
      .select("id, numero, cliente_nombre, cliente_telefono, subtotal, descuento, total, discrimina_iva, condicion_pago, entregada, creado_en")
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <Suspense>
      <ReparacionesView
        initialArticulos={((articulosData as ArticuloRow[]) ?? []).map(fromRow)}
        initialClientes={((clientesData as ClienteRow[]) ?? []).map(clienteFromRow)}
        initialReparaciones={((reparacionesData as ReparacionRow[]) ?? []).map(reparacionFromRow)}
      />
    </Suspense>
  );
}
