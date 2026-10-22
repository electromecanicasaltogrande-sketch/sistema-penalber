import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitirComprobante, type EmitirInput } from "@/lib/arca/emitir";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  let input: EmitirInput;
  try {
    input = (await request.json()) as EmitirInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Pedido inválido." }, { status: 400 });
  }
  const resultado = await emitirComprobante(supabase, input);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
