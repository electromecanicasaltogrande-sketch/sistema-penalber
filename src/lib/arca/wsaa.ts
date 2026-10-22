import "server-only";
import forge from "node-forge";
import { credencialesDe, entorno, URLS } from "./config";
import { postSoap, tag, unesc } from "./xml";

export interface Ticket {
  token: string;
  sign: string;
  expira: string; // ISO
}

function iso(d: Date): string {
  // ARCA pide hora con huso -03:00
  const t = new Date(d.getTime() - 3 * 3600 * 1000);
  return t.toISOString().slice(0, 19) + "-03:00";
}

export function armarTra(): string {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - 10 * 60 * 1000);
  const hasta = new Date(ahora.getTime() + 10 * 60 * 1000);
  const id = Math.floor(ahora.getTime() / 1000);
  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${id}</uniqueId><generationTime>${iso(desde)}</generationTime><expirationTime>${iso(hasta)}</expirationTime></header><service>wsfe</service></loginTicketRequest>`;
}

export function firmarCms(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign();
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

// Pide un ticket de acceso (válido ~12 h) para el servicio de facturación electrónica.
export async function loginWsaa(cuit: string): Promise<Ticket> {
  const cred = credencialesDe(cuit);
  if (!cred) throw new Error(`Falta el certificado de ARCA para el CUIT ${cuit}.`);
  const cms = firmarCms(armarTra(), cred.cert, cred.key);
  const sobre = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`;
  const resp = await postSoap(URLS[entorno()].wsaa, "", sobre);
  const ret = tag(resp, "loginCmsReturn");
  if (!ret) {
    const falla = tag(resp, "faultstring") ?? resp.slice(0, 300);
    throw new Error(`ARCA rechazó el inicio de sesión: ${unesc(falla)}`);
  }
  const ta = unesc(ret);
  const token = tag(ta, "token");
  const sign = tag(ta, "sign");
  const expira = tag(ta, "expirationTime");
  if (!token || !sign || !expira) throw new Error("Respuesta de ARCA sin token.");
  return { token, sign, expira: new Date(expira).toISOString() };
}
