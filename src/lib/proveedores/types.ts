export interface Proveedor {
  id: string;
  razonSocial: string;
  cuit: string;
  telefono: string;
  direccion: string;
  email: string;
}

export interface ProveedorRow {
  id: string;
  razon_social: string;
  cuit: string;
  telefono: string;
  direccion: string;
  email: string;
}

export function proveedorFromRow(r: ProveedorRow): Proveedor {
  return {
    id: r.id,
    razonSocial: r.razon_social,
    cuit: r.cuit,
    telefono: r.telefono,
    direccion: r.direccion,
    email: r.email,
  };
}

export interface FacturaCompra {
  id: string;
  proveedorId: string;
  tipoComprobante: string;
  empresaCuit: string;
  puntoVenta: string;
  numero: string;
  fechaLlegada: string | null;
  fechaFactura: string;
  neto: number;
  iva: number;
  otrosImpuestos: number;
  pagada: boolean;
}

export interface FacturaCompraRow {
  id: string;
  proveedor_id: string;
  tipo_comprobante: string;
  empresa_cuit: string;
  punto_venta: string;
  numero: string;
  fecha_llegada: string | null;
  fecha_factura: string;
  neto: number;
  iva: number;
  otros_impuestos: number;
  pagada: boolean;
}

export function facturaFromRow(r: FacturaCompraRow): FacturaCompra {
  return {
    id: r.id,
    proveedorId: r.proveedor_id,
    tipoComprobante: r.tipo_comprobante,
    empresaCuit: r.empresa_cuit,
    puntoVenta: r.punto_venta,
    numero: r.numero,
    fechaLlegada: r.fecha_llegada,
    fechaFactura: r.fecha_factura,
    neto: Number(r.neto),
    iva: Number(r.iva),
    otrosImpuestos: Number(r.otros_impuestos),
    pagada: r.pagada,
  };
}

export function totalFactura(f: Pick<FacturaCompra, "neto" | "iva" | "otrosImpuestos">): number {
  return f.neto + f.iva + f.otrosImpuestos;
}
