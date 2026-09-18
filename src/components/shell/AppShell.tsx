"use client";

import { useState } from "react";
import type { Rol } from "@/lib/auth/types";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  rol,
  nombre,
  children,
}: {
  rol: Rol;
  nombre: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar rol={rol} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar nombre={nombre} onMenuClick={() => setMobileOpen(true)} />
        <main className="px-3.5 py-4 pb-16 sm:px-5 lg:px-7 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
