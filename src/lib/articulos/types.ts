export interface Articulo {
  id: string;
  codigo: string;
  descripcion: string;
  marca: string;
  rubro: string;
  costo: number;
  precioMinorista: number;
  precioMayorista: number;
  iva: number;
  codigoBarras: string | null;
  fotoUrl: string | null;
  stock: number;
  stockMinimo: number;
}

// Fila cruda tal como viene de la tabla `articulos` (snake_case).
export interface ArticuloRow {
  id: string;
  codigo: string;
  descripcion: string;
  marca: string;
  rubro: string;
  costo: number;
  precio_minorista: number;
  precio_mayorista: number;
  iva: number;
  codigo_barras: string | null;
  foto_url: string | null;
  stock: number;
  stock_minimo: number;
}

export function fromRow(r: ArticuloRow): Articulo {
  return {
    id: r.id,
    codigo: r.codigo,
    descripcion: r.descripcion,
    marca: r.marca,
    rubro: r.rubro,
    costo: Number(r.costo),
    precioMinorista: Number(r.precio_minorista),
    precioMayorista: Number(r.precio_mayorista),
    iva: Number(r.iva),
    codigoBarras: r.codigo_barras,
    fotoUrl: r.foto_url,
    stock: r.stock,
    stockMinimo: r.stock_minimo,
  };
}

export function stockClass(a: Pick<Articulo, "stock">): "low" | "mid" | "ok" {
  if (a.stock <= 1) return "low";
  if (a.stock === 2) return "mid";
  return "ok";
}
