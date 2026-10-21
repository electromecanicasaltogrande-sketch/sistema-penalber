import { createClient } from "@/lib/supabase/server";
import ChequesView from "@/components/cheques/ChequesView";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";

export default async function ChequesPage() {
  const supabase = await createClient();
  const [{ data: pendientes }, { data: cobrados }] = await Promise.all([
    supabase.from("cheques").select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado").eq("cobrado", false).order("fecha_vencimiento").limit(1000),
    supabase.from("cheques").select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado").eq("cobrado", true).order("fecha_vencimiento", { ascending: false }).limit(300),
  ]);
  const data = [...(pendientes ?? []), ...(cobrados ?? [])];

  return <ChequesView initialCheques={((data as ChequeRow[]) ?? []).map(chequeFromRow)} />;
}
