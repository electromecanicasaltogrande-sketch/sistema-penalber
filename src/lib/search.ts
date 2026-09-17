const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una",
  "para", "con", "y", "o", "a", "en",
]);

/**
 * Matches free-text queries against an article-like record: exact/partial
 * substring match on código or código de barras, or every significant word
 * of the query present somewhere in descripción+marca+rubro, in any order.
 */
export function articleMatches(
  a: { codigo: string; codigoBarras?: string | null; descripcion: string; marca: string; rubro: string },
  term: string,
): boolean {
  const q = (term || "").trim().toLowerCase();
  if (!q) return false;
  if (a.codigo.toLowerCase().includes(q)) return true;
  if (a.codigoBarras && a.codigoBarras.toLowerCase().includes(q)) return true;
  const haystack = `${a.descripcion} ${a.marca} ${a.rubro}`.toLowerCase();
  if (haystack.includes(q)) return true;
  const words = q.split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
  if (words.length === 0) return false;
  return words.every((w) => haystack.includes(w));
}
