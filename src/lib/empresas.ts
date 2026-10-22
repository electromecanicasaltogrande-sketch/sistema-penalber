export interface Empresa {
  cuit: string;
  razonSocial: string;
  puntoVenta: string;
  titular: string;
  domicilio: string;
  telefono: string;
  ingresosBrutos: string;
  inicioActividades: string;
  condicionIva: string;
}

export const EMPRESAS: Empresa[] = [
  {
    cuit: "20245944064",
    razonSocial: "PEÑALBER RAFAEL MARTIN",
    puntoVenta: "0004",
    titular: "Rafael Peñalber",
    domicilio: "Tavella 1487, Concordia, Entre Ríos",
    telefono: "(0345) 421-2523",
    ingresosBrutos: "20245944064",
    inicioActividades: "01/07/2015",
    condicionIva: "Responsable Inscripto",
  },
  {
    cuit: "20080390174",
    razonSocial: "ELECTROTECNICA PEÑALBER",
    puntoVenta: "0006",
    titular: "Peñalber Arnolfo Martín",
    domicilio: "Tavella 1485, Concordia, Entre Ríos",
    telefono: "(0345) 405-2481",
    ingresosBrutos: "20080390174",
    inicioActividades: "04/01/2017",
    condicionIva: "Responsable Inscripto",
  },
];

export function empresaCorta(cuit: string): string {
  return EMPRESAS.find((e) => e.cuit === cuit)?.razonSocial ?? "—";
}
