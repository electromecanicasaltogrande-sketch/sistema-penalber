export interface Cheque {
  id: string;
  tipo: "cheque" | "echeq";
  titular: string;
  importe: number;
  fechaCobro: string;
  fechaVencimiento: string;
  origen: string;
  origenNumero: string | null;
  cobrado: boolean;
}

export interface ChequeRow {
  id: string;
  tipo: "cheque" | "echeq";
  titular: string;
  importe: number;
  fecha_cobro: string;
  fecha_vencimiento: string;
  origen: string;
  origen_numero: string | null;
  cobrado: boolean;
}

export function chequeFromRow(r: ChequeRow): Cheque {
  return {
    id: r.id,
    tipo: r.tipo,
    titular: r.titular,
    importe: Number(r.importe),
    fechaCobro: r.fecha_cobro,
    fechaVencimiento: r.fecha_vencimiento,
    origen: r.origen,
    origenNumero: r.origen_numero,
    cobrado: r.cobrado,
  };
}

export function diasHasta(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaISO + "T00:00:00");
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

export type EstadoCheque = "cobrado" | "vencido" | "por_vencer" | "pendiente" | "ok";

export function estadoCheque(c: Cheque): EstadoCheque {
  if (c.cobrado) return "cobrado";
  const diasVto = diasHasta(c.fechaVencimiento);
  if (diasVto < 0) return "vencido";
  if (diasVto <= 5) return "por_vencer";
  if (diasHasta(c.fechaCobro) > 0) return "pendiente";
  return "ok";
}
