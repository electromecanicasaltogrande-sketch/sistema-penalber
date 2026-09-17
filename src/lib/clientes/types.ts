export interface Cliente {
  id: string;
  razonSocial: string;
  cuit: string;
  telefono: string;
  direccion: string;
  localidad: string;
  esConsumidorFinal: boolean;
}

export interface ClienteRow {
  id: string;
  razon_social: string;
  cuit: string;
  telefono: string;
  direccion: string;
  localidad: string;
  es_consumidor_final: boolean;
}

export function clienteFromRow(r: ClienteRow): Cliente {
  return {
    id: r.id,
    razonSocial: r.razon_social,
    cuit: r.cuit,
    telefono: r.telefono,
    direccion: r.direccion,
    localidad: r.localidad,
    esConsumidorFinal: r.es_consumidor_final,
  };
}

export interface CtaCteComprobante {
  id: string;
  clienteId: string;
  empresaCuit: string;
  tipo: string;
  numero: string;
  fecha: string; // ISO yyyy-mm-dd
  total: number;
  montoPagado: number;
}

export interface CtaCteComprobanteRow {
  id: string;
  cliente_id: string;
  empresa_cuit: string;
  tipo: string;
  numero: string;
  fecha: string;
  total: number;
  monto_pagado: number;
}

export function comprobanteFromRow(r: CtaCteComprobanteRow): CtaCteComprobante {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    empresaCuit: r.empresa_cuit,
    tipo: r.tipo,
    numero: r.numero,
    fecha: r.fecha,
    total: Number(r.total),
    montoPagado: Number(r.monto_pagado),
  };
}

export function saldo(cp: Pick<CtaCteComprobante, "total" | "montoPagado">): number {
  return Math.max(0, cp.total - cp.montoPagado);
}

export function estaPagado(cp: Pick<CtaCteComprobante, "total" | "montoPagado">): boolean {
  return saldo(cp) <= 0.5;
}

export function deudaCliente(comps: CtaCteComprobante[]): number {
  return comps.filter((c) => !estaPagado(c)).reduce((s, c) => s + saldo(c), 0);
}
