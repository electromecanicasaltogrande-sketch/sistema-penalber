"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/lib/auth/types";
import { navForRol } from "@/lib/nav";

export default function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const groups = navForRol(rol);

  return (
    <aside className="sticky top-0 flex h-screen w-[230px] flex-shrink-0 flex-col bg-sidebar px-3.5 py-5 text-sidebar-ink">
      <div className="mb-3.5 border-b border-white/10 px-2.5 pb-5">
        <span className="font-[family-name:var(--font-display)] text-[15.5px] font-bold text-white">
          Peñalber
        </span>
        <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-sidebar-ink-dim">
          Sistema de gestión
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-ink-dim">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative mb-0.5 block rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                    active
                      ? "bg-gradient-to-r from-copper/25 to-copper/5 text-white"
                      : "text-sidebar-ink hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute -left-1 top-2 bottom-2 w-[3px] rounded bg-copper" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
