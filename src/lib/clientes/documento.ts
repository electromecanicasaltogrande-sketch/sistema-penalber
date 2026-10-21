export type TipoDoc = "CUIT" | "CUIL" | "DNI" | "SIN";

// Códigos de tipo de documento del receptor que pide ARCA (WSFE).
export const TIPOS_DOC: { id: TipoDoc; label: string; codigoArca: number }[] = [
  { id: "CUIT", label: "CUIT", codigoArca: 80 },
  { id: "CUIL", label: "CUIL", codigoArca: 86 },
  { id: "DNI", label: "DNI", codigoArca: 96 },
  { id: "SIN", label: "Sin identificar", codigoArca: 99 },
];

// Condición frente al IVA del receptor (campo obligatorio en las facturas electrónicas).
export const CONDICIONES_IVA: { id: string; label: string; codigoArca: number; facturaA: boolean }[] = [
  { id: "responsable_inscripto", label: "Responsable Inscripto", codigoArca: 1, facturaA: true },
  { id: "monotributo", label: "Monotributo", codigoArca: 6, facturaA: true },
  { id: "consumidor_final", label: "Consumidor Final", codigoArca: 5, facturaA: false },
  { id: "exento", label: "IVA Exento", codigoArca: 4, facturaA: false },
  { id: "no_alcanzado", label: "IVA No Alcanzado", codigoArca: 15, facturaA: false },
];

export interface DatosManuales {
  tipoDoc: TipoDoc;
  numero: string;
  razonSocial: string;
  domicilio: string;
  localidad: string;
  condicionIva: string;
}

export function soloDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export function validarCuit(valor: string): boolean {
  const d = soloDigitos(valor);
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 9;
  return dv === Number(d[10]);
}

export function formatearCuit(valor: string): string {
  const d = soloDigitos(valor);
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : d;
}

// Devuelve un mensaje de error, o null si el documento es válido.
export function validarDocumento(tipo: TipoDoc, numero: string): string | null {
  const d = soloDigitos(numero);
  if (tipo === "SIN") return null;
  if (tipo === "CUIT" || tipo === "CUIL") {
    if (d.length !== 11) return `El ${tipo} tiene que tener 11 dígitos.`;
    if (!validarCuit(d)) return `El ${tipo} no es válido (revisá el número verificador).`;
    return null;
  }
  if (d.length < 7 || d.length > 8) return "El DNI tiene que tener 7 u 8 dígitos.";
  return null;
}
