import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shell/AppShell";
import type { Perfil } from "@/lib/auth/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!perfil) redirect("/login");

  return (
    <AppShell rol={perfil.rol} nombre={perfil.nombre}>
      {children}
    </AppShell>
  );
}
