import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { COLUMNAS_ARTICULO } from "./fetchAll";
import { fromRow, type Articulo, type ArticuloRow } from "./types";

// Con catálogos de 50.000-100.000+ artículos, traer toda la tabla al
// navegador para buscar en memoria (como se hacía antes) es inviable.
// Estas funciones buscan del lado del servidor, con ILIKE sobre índices
// trigram (ver migración 0013), y solo traen un puñado de resultados.

function escaparPatronIlike(s: string): string {
  return s.replace(/[%_]/g, (m) => "\\" + m);
}

const MAX_PALABRAS_BUSQUEDA = 6;

// Cada palabra del término buscado tiene que aparecer en algún campo (no
// necesariamente el mismo, ni en ese orden) — p.ej. "alternador bosch 65a"
// encuentra "ALTERNADOR TIPO BOSCH 24V 65A". Se arma como un AND de grupos
// OR: cada .or() adicional en supabase-js se combina con AND respecto a los
// anteriores.
function aplicarBusquedaTexto<T extends { or: (f: string) => T }>(query: T, texto: string): T {
  const palabras = texto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_PALABRAS_BUSQUEDA);
  for (const palabra of palabras) {
    const patron = `%${escaparPatronIlike(palabra)}%`;
    query = query.or(
      `codigo.ilike.${patron},descripcion.ilike.${patron},marca.ilike.${patron},codigo_barras.ilike.${patron}`,
    );
  }
  return query;
}

export async function buscarArticulos(
  supabase: SupabaseClient<Database>,
  texto: string,
  limite = 8,
): Promise<Articulo[]> {
  const q = texto.trim();
  if (q.length < 2) return [];
  const query = aplicarBusquedaTexto(
    supabase.from("articulos").select(COLUMNAS_ARTICULO),
    q,
  ).order("codigo").limit(limite);
  const { data } = await query;
  return ((data as unknown as ArticuloRow[]) ?? []).map(fromRow);
}

// Código de barras exacto, o código de artículo exacto (sin importar
// mayúsculas/minúsculas) — usado al escanear o al tipear el código completo.
export async function buscarArticuloExacto(
  supabase: SupabaseClient<Database>,
  termino: string,
): Promise<Articulo | null> {
  const term = termino.trim();
  if (!term) return null;

  const { data: porBarras } = await supabase
    .from("articulos")
    .select(COLUMNAS_ARTICULO)
    .eq("codigo_barras", term)
    .limit(1)
    .maybeSingle();
  if (porBarras) return fromRow(porBarras as unknown as ArticuloRow);

  const { data: porCodigo } = await supabase
    .from("articulos")
    .select(COLUMNAS_ARTICULO)
    .ilike("codigo", term)
    .limit(1)
    .maybeSingle();
  if (porCodigo) return fromRow(porCodigo as unknown as ArticuloRow);

  return null;
}

// Trae los artículos completos para un conjunto puntual de códigos (p.ej.
// las líneas de un carrito al confirmar una venta) sin traer el catálogo.
export async function buscarArticulosPorCodigos(
  supabase: SupabaseClient<Database>,
  codigos: string[],
): Promise<Articulo[]> {
  const unicos = [...new Set(codigos.filter(Boolean))];
  if (unicos.length === 0) return [];
  const { data } = await supabase.from("articulos").select(COLUMNAS_ARTICULO).in("codigo", unicos);
  return ((data as unknown as ArticuloRow[]) ?? []).map(fromRow);
}

// Para saber cuáles de los códigos de un archivo importado ya existen en la
// base, sin traer el catálogo entero: consulta solo esos códigos, en tandas
// (el filtro .in() de PostgREST tiene un límite práctico de tamaño de URL).
const TAMANO_TANDA_IN = 300;

export async function codigosExistentes(
  supabase: SupabaseClient<Database>,
  codigos: string[],
): Promise<Set<string>> {
  const unicos = [...new Set(codigos.filter(Boolean))];
  const existentes = new Set<string>();
  for (let i = 0; i < unicos.length; i += TAMANO_TANDA_IN) {
    const tanda = unicos.slice(i, i + TAMANO_TANDA_IN);
    const { data } = await supabase.from("articulos").select("codigo").in("codigo", tanda);
    for (const row of (data as { codigo: string }[] | null) ?? []) {
      existentes.add(row.codigo.toLowerCase());
    }
  }
  return existentes;
}

export interface FiltrosArticulos {
  texto?: string;
  rubros?: string[];
  marcas?: string[];
}

// Página de resultados para la pantalla de Artículos y Stock: filtra y
// pagina del lado del servidor en vez de traer el catálogo entero.
export async function buscarArticulosPaginado(
  supabase: SupabaseClient<Database>,
  filtros: FiltrosArticulos,
  pagina: number,
  tamanoPagina: number,
  orden: { campo: "codigo" | "stock"; ascendente: boolean } = { campo: "codigo", ascendente: true },
): Promise<{ articulos: Articulo[]; total: number }> {
  let query = supabase
    .from("articulos")
    .select(COLUMNAS_ARTICULO, { count: "exact" })
    .order(orden.campo, { ascending: orden.ascendente });

  const texto = filtros.texto?.trim() ?? "";
  if (texto.length >= 2) {
    query = aplicarBusquedaTexto(query, texto);
  }
  if (filtros.rubros && filtros.rubros.length > 0) query = query.in("rubro", filtros.rubros);
  if (filtros.marcas && filtros.marcas.length > 0) query = query.in("marca", filtros.marcas);

  const desde = pagina * tamanoPagina;
  const { data, count } = await query.range(desde, desde + tamanoPagina - 1);

  return {
    articulos: ((data as unknown as ArticuloRow[]) ?? []).map(fromRow),
    total: count ?? 0,
  };
}

export async function listarRubrosDistintos(supabase: SupabaseClient<Database>): Promise<string[]> {
  const { data } = await supabase.rpc("articulos_rubros_distintos");
  return ((data as { rubro: string }[] | null) ?? []).map((r) => r.rubro);
}

export async function listarMarcasDistintas(supabase: SupabaseClient<Database>): Promise<string[]> {
  const { data } = await supabase.rpc("articulos_marcas_distintas");
  return ((data as { marca: string }[] | null) ?? []).map((r) => r.marca);
}
