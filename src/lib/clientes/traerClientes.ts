import type { SupabaseClient } from "@supabase/supabase-js";
import { traerTodo } from "@/lib/supabase/traerTodo";
import { clienteFromRow, type Cliente, type ClienteRow } from "./types";

export async function traerClientes(supabase: SupabaseClient): Promise<Cliente[]> {
  const filas = await traerTodo<ClienteRow>((d, h) =>
    supabase
      .from("clientes")
      .select("id, razon_social, cuit, telefono, direccion, localidad, es_consumidor_final, tipo_comprobante_default, condicion_iva, codigo")
      .order("razon_social")
      .order("id")
      .range(d, h),
  );
  return filas.map(clienteFromRow);
}
