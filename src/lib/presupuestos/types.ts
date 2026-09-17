export interface PresupuestoConfig {
  textoIntro: string;
  observaciones: string;
  diasValidez: number;
  firma: string;
  mostrarEmpresa: boolean;
}

export interface PresupuestoConfigRow {
  texto_intro: string;
  observaciones: string;
  dias_validez: number;
  firma: string;
  mostrar_empresa: boolean;
}

export function configFromRow(r: PresupuestoConfigRow): PresupuestoConfig {
  return {
    textoIntro: r.texto_intro,
    observaciones: r.observaciones,
    diasValidez: r.dias_validez,
    firma: r.firma,
    mostrarEmpresa: r.mostrar_empresa,
  };
}

export interface PresupuestoVenta {
  id: string;
  numero: string;
  clienteId: string | null;
  clienteNombre: string;
  listaPrecio: "minorista" | "mayorista";
  subtotal: number;
  estado: "Pendiente" | "Facturado";
  creadoEn: string;
}

export interface PresupuestoVentaRow {
  id: string;
  numero: string;
  cliente_id: string | null;
  cliente_nombre: string;
  lista_precio: "minorista" | "mayorista";
  subtotal: number;
  estado: "Pendiente" | "Facturado";
  creado_en: string;
}

export function presupuestoFromRow(r: PresupuestoVentaRow): PresupuestoVenta {
  return {
    id: r.id,
    numero: r.numero,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    listaPrecio: r.lista_precio,
    subtotal: Number(r.subtotal),
    estado: r.estado,
    creadoEn: r.creado_en,
  };
}
