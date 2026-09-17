"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sectionTitle } from "@/lib/nav";
import { logout } from "@/app/login/actions";

export default function Topbar({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const initial = nombre.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-7 py-4">
      <div>
        <h1 className="text-[19px] font-bold text-ink">{sectionTitle(pathname)}</h1>
      </div>
      <div className="flex items-center gap-3.5">
        {now && (
          <span className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-ink-soft">
            {now.toLocaleDateString("es-AR")} · {now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg py-1.5 pl-1.5 pr-2.5">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-copper text-[11px] font-bold text-white">
            {initial}
          </span>
          <span className="text-xs font-semibold text-ink">{nombre}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-danger hover:text-danger"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
