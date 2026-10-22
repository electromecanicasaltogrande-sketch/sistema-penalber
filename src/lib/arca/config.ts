import "server-only";

export type Entorno = "produccion" | "homologacion";

export function entorno(): Entorno {
  return process.env.ARCA_ENTORNO === "homologacion" ? "homologacion" : "produccion";
}

export const URLS: Record<Entorno, { wsaa: string; wsfe: string }> = {
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
};

// Por seguridad no se emiten comprobantes reales hasta activarlo a propósito.
export function emisionHabilitada(): boolean {
  return process.env.ARCA_EMISION_HABILITADA === "true";
}

// Acepta el PEM pegado con saltos de línea reales, con "\n" literales o sin saltos.
function normalizarPem(valor: string): string {
  let v = valor.trim().replace(/\\n/g, "\n").replace(/\r/g, "");
  const m = v.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return v;
  const cuerpo = m[2].replace(/\s+/g, "");
  const lineas = cuerpo.match(/.{1,64}/g) ?? [];
  v = `-----BEGIN ${m[1]}-----\n${lineas.join("\n")}\n-----END ${m[1]}-----\n`;
  return v;
}

// Certificado y clave privada de cada CUIT: variables ARCA_CERT_<cuit> y ARCA_KEY_<cuit>.
export function credencialesDe(cuit: string): { cert: string; key: string } | null {
  const cert = process.env[`ARCA_CERT_${cuit}`];
  const key = process.env[`ARCA_KEY_${cuit}`];
  if (!cert || !key) return null;
  return { cert: normalizarPem(cert), key: normalizarPem(key) };
}
