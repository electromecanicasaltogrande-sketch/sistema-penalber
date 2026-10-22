import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMPRESAS } from "@/lib/empresas";
import { credencialesDe, emisionHabilitada, entorno } from "@/lib/arca/config";
import { obtenerAuth } from "@/lib/arca/ticket";
import { feDummy, puntosDeVenta, ultimoAutorizado } from "@/lib/arca/wsfe";

export const maxDuration = 60;

// Diagnóstico de la conexión con ARCA. Solo consulta (no emite nada).
// Con ?probar=1 además inicia sesión en ARCA y lee la numeración de cada empresa.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

  const probar = new URL(request.url).searchParams.get("probar") === "1";
  const empresas = [];
  for (const e of EMPRESAS) {
    const fila: Record<string, unknown> = { cuit: e.cuit, razonSocial: e.razonSocial, puntoVenta: e.puntoVenta, certificadoCargado: !!credencialesDe(e.cuit) };
    if (probar && fila.certificadoCargado) {
      try {
        const auth = await obtenerAuth(supabase, e.cuit);
        const pv = Number(e.puntoVenta);
        fila.sesionArca = "ok";
        fila.puntosDeVenta = await puntosDeVenta(auth);
        fila.ultimosNumeros = {
          factura_a: await ultimoAutorizado(auth, pv, 1),
          factura_b: await ultimoAutorizado(auth, pv, 6),
          nc_a: await ultimoAutorizado(auth, pv, 3),
          nc_b: await ultimoAutorizado(auth, pv, 8),
        };
      } catch (err) {
        fila.sesionArca = "error";
        fila.error = err instanceof Error ? err.message : String(err);
      }
    }
    empresas.push(fila);
  }
  let servidores: unknown = null;
  if (probar) {
    try {
      servidores = await feDummy();
    } catch (err) {
      servidores = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return NextResponse.json({ ok: true, entorno: entorno(), emisionHabilitada: emisionHabilitada(), servidores, empresas });
}
