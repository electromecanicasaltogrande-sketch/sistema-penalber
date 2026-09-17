import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
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
    <div className="flex min-h-screen">
      <Sidebar rol={perfil.rol} />
      <div className="min-w-0 flex-1">
        <Topbar nombre={perfil.nombre} />
        <main className="px-7 py-6 pb-16">{children}</main>
      </div>
    </div>
  );
}
