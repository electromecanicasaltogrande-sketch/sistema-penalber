import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/getUsuarioActual";
import AppShell from "@/components/shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, perfil } = await getUsuarioActual();

  if (!user || !perfil) redirect("/login");

  return (
    <AppShell rol={perfil.rol} nombre={perfil.nombre}>
      {children}
    </AppShell>
  );
}
