import { createClient } from "@/lib/supabase/server";
import { COLUMNAS_ARTICULO } from "@/lib/articulos/fetchAll";
import { fromRow, type ArticuloRow } from "@/lib/articulos/types";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";
import type { VentaRow } from "@/lib/ventas/historial";
import DashboardView from "@/components/dashboard/DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // El stock bajo se calcula del lado del servidor (vista v_articulos_stock_bajo,
  // migración 0013) en vez de traer todo el catálogo para filtrarlo en el
  // cliente — con 50-100 mil artículos eso sería inviable.
  const [{ data: ventasData }, { data: stockBajoData, count: stockBajoTotal }, { data: chequesData }] =
    await Promise.all([
      supabase
        .from("ventas")
        .select("id, numero, tipo, doc_type, empresa_cuit, cliente_nombre, dni, condicion_pago, subtotal, descuento, total, discrimina_iva, cae, cae_vencimiento, creado_en")
        .gte("creado_en", sevenDaysAgo.toISOString()),
      supabase
        .from("v_articulos_stock_bajo")
        .select(COLUMNAS_ARTICULO, { count: "exact" })
        .order("codigo")
        .limit(12),
      supabase
        .from("cheques")
        .select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado")
        .eq("cobrado", false)
        .order("fecha_vencimiento"),
    ]);

  const stockBajo = ((stockBajoData as unknown as ArticuloRow[]) ?? []).map(fromRow);

  return (
    <DashboardView
      ventas7dias={(ventasData as VentaRow[]) ?? []}
      stockBajo={stockBajo}
      stockBajoTotal={stockBajoTotal ?? 0}
      cheques={((chequesData as ChequeRow[]) ?? []).map(chequeFromRow)}
    />
  );
}
