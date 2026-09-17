import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnConstruccion from "@/components/shell/EnConstruccion";
import type { Perfil } from "@/lib/auth/types";

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single<Perfil>();

  if (!perfil || perfil.rol !== "admin") redirect("/");

  return <EnConstruccion modulo="Reportes" />;
}
