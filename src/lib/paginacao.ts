/**
 * Paginacao das listagens.
 *
 * Antes as consultas terminavam num `.limit(300)` mudo: passando disso, os
 * registros mais antigos sumiam da tela sem nenhum aviso, e quem olhava a lista
 * nao tinha como saber que ela estava incompleta. O corte continua existindo -
 * so que agora ele e visivel, tem tamanho declarado e da para atravessar.
 */

export const POR_PAGINA = 50;

export interface Pagina<T> {
  itens: T[];
  /** Total no banco, nao o tamanho de `itens`. E o que o rodape mostra. */
  total: number;
  pagina: number;
  paginas: number;
}

/** Numero de pagina vindo da URL. Lixo, zero e negativo caem na primeira. */
export function paginaDaUrl(bruto: string | undefined): number {
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function pularDe(pagina: number): number {
  return (pagina - 1) * POR_PAGINA;
}

export function montarPagina<T>(itens: T[], total: number, pagina: number): Pagina<T> {
  // Lista vazia ainda e uma pagina - senao o rodape diria "pagina 1 de 0".
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
