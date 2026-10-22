import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { entorno } from "./config";
import { loginWsaa } from "./wsaa";
import type { Auth } from "./wsfe";

// El ticket dura ~12 horas y ARCA no deja pedir otro mientras haya uno vigente,
// por eso se guarda en la base (tabla arca_tokens) y se reutiliza entre pedidos.
export async function obtenerAuth(supabase: SupabaseClient, cuit: string): Promise<Auth> {
  const env = entorno();
  const { data } = await supabase.from("arca_tokens").select("token, sign, expira").eq("cuit", cuit).eq("entorno", env).maybeSingle();
  if (data && new Date(data.expira).getTime() - Date.now() > 15 * 60 * 1000) {
    return { token: data.token, sign: data.sign, cuit };
  }
  const t = await loginWsaa(cuit);
  await supabase.from("arca_tokens").upsert({ cuit, entorno: env, token: t.token, sign: t.sign, expira: t.expira });
  return { token: t.token, sign: t.sign, cuit };
}
