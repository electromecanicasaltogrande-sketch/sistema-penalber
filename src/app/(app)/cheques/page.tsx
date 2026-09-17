import { createClient } from "@/lib/supabase/server";
import ChequesView from "@/components/cheques/ChequesView";
import { chequeFromRow, type ChequeRow } from "@/lib/cheques/types";

export default async function ChequesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cheques")
    .select("id, tipo, titular, importe, fecha_cobro, fecha_vencimiento, origen, origen_numero, cobrado")
    .order("fecha_vencimiento");

  return <ChequesView initialCheques={((data as ChequeRow[]) ?? []).map(chequeFromRow)} />;
}
