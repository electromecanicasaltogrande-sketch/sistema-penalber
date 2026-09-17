export interface Empresa {
  cuit: string;
  razonSocial: string;
  puntoVenta: string;
}

export const EMPRESAS: Empresa[] = [
  { cuit: "20245944064", razonSocial: "PEÑALBER RAFAEL MARTIN", puntoVenta: "0004" },
  { cuit: "20080390174", razonSocial: "ELECTROTECNICA PEÑALBER", puntoVenta: "0006" },
];

export function empresaCorta(cuit: string): string {
  return EMPRESAS.find((e) => e.cuit === cuit)?.razonSocial ?? "—";
}
