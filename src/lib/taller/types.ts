export interface Reparacion {
  id: string;
  numero: string;
  clienteNombre: string;
  clienteTelefono: string;
  subtotal: number;
  descuento: number;
  total: number;
  discriminaIva: boolean;
  condicionPago: string;
  entregada: boolean;
  creadoEn: string;
}

export interface ReparacionRow {
  id: string;
  numero: string;
  cliente_nombre: string;
  cliente_telefono: string;
  subtotal: number;
  descuento: number;
  total: number;
  discrimina_iva: boolean;
  condicion_pago: string;
  entregada: boolean;
  creado_en: string;
}

export function reparacionFromRow(r: ReparacionRow): Reparacion {
  return {
    id: r.id,
    numero: r.numero,
    clienteNombre: r.cliente_nombre,
    clienteTelefono: r.cliente_telefono,
    subtotal: Number(r.subtotal),
    descuento: Number(r.descuento),
    total: Number(r.total),
    discriminaIva: r.discrimina_iva,
    condicionPago: r.condicion_pago,
    entregada: r.entregada,
    creadoEn: r.creado_en,
  };
}

export interface PresupuestoTaller {
  id: string;
  numero: string;
  clienteNombre: string;
  clienteTelefono: string;
  subtotal: number;
  descuento: number;
  discriminaIva: boolean;
  estado: "Pendiente" | "Exportado" | "NoLoHizo";
  cobroNoHizo: number | null;
  creadoEn: string;
}

export interface PresupuestoTallerRow {
  id: string;
  numero: string;
  cliente_nombre: string;
  cliente_telefono: string;
  subtotal: number;
  descuento: number;
  discrimina_iva: boolean;
  estado: "Pendiente" | "Exportado" | "NoLoHizo";
  cobro_no_hizo: number | null;
  creado_en: string;
}

export function presupuestoTallerFromRow(r: PresupuestoTallerRow): PresupuestoTaller {
  return {
    id: r.id,
    numero: r.numero,
    clienteNombre: r.cliente_nombre,
    clienteTelefono: r.cliente_telefono,
    subtotal: Number(r.subtotal),
    descuento: Number(r.descuento),
    discriminaIva: r.discrimina_iva,
    estado: r.estado,
    cobroNoHizo: r.cobro_no_hizo != null ? Number(r.cobro_no_hizo) : null,
    creadoEn: r.creado_en,
  };
}
