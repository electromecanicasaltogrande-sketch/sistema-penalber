import type { Rol } from "@/lib/auth/types";

export interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/ventas", label: "Ventas" },
      { href: "/presupuestos", label: "Presupuestos" },
    ],
  },
  {
    label: "Inventario",
    items: [{ href: "/articulos", label: "Artículos y Stock" }],
  },
  {
    label: "Proveedores",
    items: [{ href: "/proveedores", label: "Proveedores" }],
  },
  {
    label: "Cuentas",
    items: [
      { href: "/clientes", label: "Clientes / Cta. Cte." },
      { href: "/devoluciones", label: "Devoluciones" },
      { href: "/facturacion", label: "Facturación / ARCA" },
      { href: "/historial", label: "Historial de comprobantes" },
      { href: "/caja", label: "Caja" },
      { href: "/cheques", label: "Cheques" },
    ],
  },
  {
    label: "Taller",
    items: [
      { href: "/reparaciones", label: "Reparaciones" },
      { href: "/presupuestos-taller", label: "Presupuestos Taller" },
    ],
  },
  {
    label: "Análisis",
    items: [{ href: "/reportes", label: "Reportes", adminOnly: true }],
  },
];

export function navForRol(rol: Rol): NavGroup[] {
  if (rol === "admin") return NAV;
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}

export function sectionTitle(pathname: string): string {
  for (const group of NAV) {
    for (const item of group.items) {
      if (
        item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(item.href + "/")
      ) {
        return item.label;
      }
    }
  }
  return "Dashboard";
}
