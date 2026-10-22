import "server-only";
import { entorno, URLS } from "./config";
import { esc, postSoap, tag, tags, unesc } from "./xml";

const NS = "http://ar.gov.afip.dif.FEV1/";

export interface Auth {
  token: string;
  sign: string;
  cuit: string;
}

function sobre(metodo: string, cuerpo: string, auth?: Auth): string {
  const a = auth
    ? `<ar:Auth><ar:Token>${esc(auth.token)}</ar:Token><ar:Sign>${esc(auth.sign)}</ar:Sign><ar:Cuit>${esc(auth.cuit)}</ar:Cuit></ar:Auth>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}"><soap:Body><ar:${metodo}>${a}${cuerpo}</ar:${metodo}></soap:Body></soap:Envelope>`;
}

async function llamar(metodo: string, cuerpo: string, auth?: Auth): Promise<string> {
  const resp = await postSoap(URLS[entorno()].wsfe, `${NS}${metodo}`, sobre(metodo, cuerpo, auth));
  const falla = tag(resp, "faultstring");
  if (falla) throw new Error(`ARCA: ${unesc(falla)}`);
  return resp;
}

export interface ErrorArca {
  codigo: string;
  mensaje: string;
}

function errores(xml: string): ErrorArca[] {
  const bloque = tag(xml, "Errors");
  if (!bloque) return [];
  return tags(bloque, "Err").map((e) => ({ codigo: tag(e, "Code") ?? "", mensaje: unesc(tag(e, "Msg") ?? "") }));
}

function observaciones(xml: string): ErrorArca[] {
  const bloque = tag(xml, "Observaciones");
  if (!bloque) return [];
  return tags(bloque, "Obs").map((e) => ({ codigo: tag(e, "Code") ?? "", mensaje: unesc(tag(e, "Msg") ?? "") }));
}

export async function feDummy(): Promise<{ app: string; db: string; auth: string }> {
  const x = await llamar("FEDummy", "");
  return { app: tag(x, "AppServer") ?? "", db: tag(x, "DbServer") ?? "", auth: tag(x, "AuthServer") ?? "" };
}

export async function ultimoAutorizado(auth: Auth, ptoVta: number, cbteTipo: number): Promise<number> {
  const x = await llamar("FECompUltimoAutorizado", `<ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo>`, auth);
  const e = errores(x);
  if (e.length) throw new Error(`ARCA (${e[0].codigo}): ${e[0].mensaje}`);
  return Number(tag(x, "CbteNro") ?? 0);
}

export async function puntosDeVenta(auth: Auth): Promise<{ numero: number; bloqueado: boolean; tipo: string }[]> {
  const x = await llamar("FEParamGetPtosVenta", "", auth);
  const e = errores(x);
  if (e.length) throw new Error(`ARCA (${e[0].codigo}): ${e[0].mensaje}`);
  return tags(x, "PtoVenta").map((p) => ({
    numero: Number(tag(p, "Nro") ?? 0),
    tipo: tag(p, "EmisionTipo") ?? "",
    bloqueado: (tag(p, "Bloqueado") ?? "N") === "S",
  }));
}

export interface IvaAlicuota {
  id: number; // 3=0%, 4=10,5%, 5=21%, 6=27%
  base: number;
  importe: number;
}

export interface SolicitudCae {
  ptoVta: number;
  cbteTipo: number;
  concepto: 1 | 2 | 3;
  docTipo: number;
  docNro: string;
  cbteNro: number;
  fecha: string; // YYYYMMDD
  total: number;
  neto: number;
  iva: number;
  alicuotas: IvaAlicuota[];
  condicionIvaReceptor: number;
  asociado?: { tipo: number; ptoVta: number; nro: number };
}

export interface ResultadoCae {
  resultado: "A" | "R" | "P" | "";
  cae: string;
  caeVto: string; // YYYYMMDD
  cbteNro: number;
  observaciones: ErrorArca[];
  errores: ErrorArca[];
}

const n2 = (x: number) => x.toFixed(2);

export async function solicitarCae(auth: Auth, s: SolicitudCae): Promise<ResultadoCae> {
  const iva = s.alicuotas.length
    ? `<ar:Iva>${s.alicuotas
        .map((a) => `<ar:AlicIva><ar:Id>${a.id}</ar:Id><ar:BaseImp>${n2(a.base)}</ar:BaseImp><ar:Importe>${n2(a.importe)}</ar:Importe></ar:AlicIva>`)
        .join("")}</ar:Iva>`
    : "";
  const asoc = s.asociado
    ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${s.asociado.tipo}</ar:Tipo><ar:PtoVta>${s.asociado.ptoVta}</ar:PtoVta><ar:Nro>${s.asociado.nro}</ar:Nro></ar:CbteAsoc></ar:CbtesAsoc>`
    : "";
  const cuerpo = `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${s.ptoVta}</ar:PtoVta><ar:CbteTipo>${s.cbteTipo}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>${s.concepto}</ar:Concepto><ar:DocTipo>${s.docTipo}</ar:DocTipo><ar:DocNro>${esc(s.docNro)}</ar:DocNro><ar:CbteDesde>${s.cbteNro}</ar:CbteDesde><ar:CbteHasta>${s.cbteNro}</ar:CbteHasta><ar:CbteFch>${s.fecha}</ar:CbteFch><ar:ImpTotal>${n2(s.total)}</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc><ar:ImpNeto>${n2(s.neto)}</ar:ImpNeto><ar:ImpOpEx>0.00</ar:ImpOpEx><ar:ImpTrib>0.00</ar:ImpTrib><ar:ImpIVA>${n2(s.iva)}</ar:ImpIVA><ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz><ar:CondicionIVAReceptorId>${s.condicionIvaReceptor}</ar:CondicionIVAReceptorId>${asoc}${iva}</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`;
  const x = await llamar("FECAESolicitar", cuerpo, auth);
  const det = tag(x, "FECAEDetResponse") ?? "";
  const resultado = ((tag(det, "Resultado") ?? tag(x, "Resultado") ?? "") as ResultadoCae["resultado"]);
  return {
    resultado,
    cae: tag(det, "CAE") ?? "",
    caeVto: tag(det, "CAEFchVto") ?? "",
    cbteNro: Number(tag(det, "CbteDesde") ?? s.cbteNro),
    observaciones: observaciones(det),
    errores: errores(x),
  };
}
