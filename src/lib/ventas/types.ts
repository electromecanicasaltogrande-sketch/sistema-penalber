export type DocType = "factura_a" | "factura_b" | "factura_c" | "remito_r" | "nc_a" | "nc_b";
export type CondicionPago = "efectivo" | "transferencia" | "tarjeta" | "cheque" | "echeq" | "cta_cte";

export interface DocInfo {
  nombre: string;
  hasCae: boolean;
  hint: string;
  prefijo: string;
  letra: string;
}

export const DOC_LABELS: Record<DocType, DocInfo> = {
  factura_a: {
    nombre: "Factura A",
    hasCae: true,
    hint: "Se emite con CAE en ARCA — para responsables inscriptos",
    prefijo: "FC A",
    letra: "A",
  },
  factura_b: {
    nombre: "Factura B",
    hasCae: true,
    hint: "Se emite con CAE en ARCA",
    prefijo: "FC B",
    letra: "B",
  },
  factura_c: {
    nombre: "Factura C",
    hasCae: true,
    hint: "Se emite con CAE en ARCA — monotributo",
    prefijo: "FC C",
    letra: "C",
  },
  remito_r: {
    nombre: "Remito R",
    hasCae: false,
    hint: "Sin IVA discriminado, no se emite a ARCA — queda como comprobante interno",
    prefijo: "REM R",
    letra: "R",
  },
  nc_a: {
    nombre: "Nota de Crédito A",
    hasCae: true,
    hint: "Se asocia a una factura A existente y se emite con CAE",
    prefijo: "NC A",
    letra: "A",
  },
  nc_b: {
    nombre: "Nota de Crédito B",
    hasCae: true,
    hint: "Se asocia a una factura B existente y se emite con CAE",
    prefijo: "NC B",
    letra: "B",
  },
};

export interface CartItem {
  codigo: string | null;
  descripcion: string;
  marca: string;
  cantidad: number;
  precio: number;
  iva: number;
  stockDisponible?: number;
}

export const FORMAS_PAGO: { id: CondicionPago; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "cheque", label: "Cheque" },
  { id: "echeq", label: "eCheq" },
  { id: "cta_cte", label: "Cuenta Corriente" },
];
