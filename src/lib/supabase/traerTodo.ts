// PostgREST devuelve como máximo 1.000 filas por consulta: esto pide la tabla
// completa de a páginas. `armar` recibe el rango y devuelve la consulta.
export async function traerTodo<T>(
  armar: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const PAGINA = 1000;
  const todo: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data } = await armar(desde, desde + PAGINA - 1);
    const filas = data ?? [];
    todo.push(...filas);
    if (filas.length < PAGINA) break;
  }
  return todo;
}
