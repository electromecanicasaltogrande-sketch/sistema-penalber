import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "./types";

// El middleware (src/proxy.ts) ya valida la sesión contra el servidor de
// Supabase Auth (getUser) en cada request y redirige a /login si no es
// válida, así que acá alcanza con leer la sesión de la cookie (getSession,
// sin red) — y con React cache() esta función corre una sola vez por
// request aunque el layout y la página la llamen por separado, en vez de
// repetir la consulta de sesión + perfil dos o tres veces en cada
// navegación.
export const getUsuarioActual = cache(async (): Promise<{ user: { id: string } | null; perfil: Perfil | null }> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { user: null, perfil: null };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single<Perfil>();

  return { user, perfil: perfil ?? null };
});
