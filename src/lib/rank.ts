/**
 * LexoRank: a ordem dentro da coluna como string ordenavel.
 *
 * O ponto e mover um card com 1 UPDATE, nunca reescrevendo a coluna inteira.
 * Entre dois ranks quaisquer sempre cabe outro; quando nao cabe no comprimento
 * atual, a string cresce um caractere.
 *
 * Alfabeto base-36 (0-9a-z): cabe em varchar(64) e a collation
 * utf8mb4_0900_ai_ci compara estes caracteres na mesma ordem que o JS.
 */

const ALFABETO = "0123456789abcdefghijklmnopqrstuvwxyz";
const BASE = ALFABETO.length;
const COMPRIMENTO_MAX = 64;

/**
 * Rank do primeiro card de uma coluna. Fica no meio do alfabeto de proposito:
 * assim sobra espaco tanto para inserir acima quanto abaixo sem esticar a string.
 */
export const RANK_INICIAL = "hzzzzz";

function valor(c: string): number {
  const i = ALFABETO.indexOf(c);
  if (i === -1) throw new Error(`Caractere fora do alfabeto de rank: "${c}"`);
  return i;
}

/**
 * Rank estritamente entre `antes` e `depois`.
 * null em `antes` = topo da coluna; null em `depois` = fim da coluna.
 */
export function rankEntre(antes: string | null, depois: string | null): string {
  const a = antes ?? "";
  const b = depois ?? "";

  if (a !== "" && b !== "" && a >= b) {
    throw new Error(`rankEntre exige antes < depois; veio "${a}" e "${b}".`);
  }

  let resultado = "";
  // Depois que os dois se separam, `depois` deixa de limitar as casas seguintes.
  let divergiu = b === "";

  for (let i = 0; i < COMPRIMENTO_MAX; i++) {
    const va = i < a.length ? valor(a[i]!) : 0;
    const vb = divergiu || i >= b.length ? BASE : valor(b[i]!);

    if (vb - va > 1) {
      return conferir(resultado + ALFABETO[Math.floor((va + vb) / 2)]!, a, b);
    }

    // Sem folga nesta casa: acompanha `antes` e procura espaco na proxima.
    resultado += ALFABETO[va]!;
    if (!divergiu && va < vb) divergiu = true;
  }

  throw new Error("Rank sem espaco disponivel - a coluna precisa ser reindexada.");
}

/**
 * A ordenacao do Kanban depende disto estar certo, e um rank invalido so
 * apareceria como card no lugar errado - dificil de rastrear depois.
 * Barato o suficiente para rodar sempre.
 */
function conferir(r: string, a: string, b: string): string {
  if ((a !== "" && r <= a) || (b !== "" && r >= b)) {
    throw new Error(`Rank calculado fora do intervalo: "${a}" < "${r}" < "${b}" e falso.`);
  }
  return r;
}

export function rankValido(r: string): boolean {
  return r.length > 0 && r.length <= COMPRIMENTO_MAX && [...r].every((c) => ALFABETO.includes(c));
}

/**
 * `n` ranks igualmente espacados, para reindexar uma coluna cujo intervalo
 * esgotou. Encadear rankEntre() nao serve aqui: cada chamada pega o meio do que
 * sobrou, entao os ranks se amontoariam no fim do alfabeto e o problema voltaria
 * na sequencia. Espacamento uniforme devolve a folga por igual.
 */
export function ranksDistribuidos(n: number): string[] {
  if (n <= 0) return [];

  // Folga de 8 slots por card antes de precisar esticar a string de novo.
  let largura = 2;
  while (BASE ** largura < (n + 1) * 8) largura++;

  const passo = Math.floor(BASE ** largura / (n + 1));
  return Array.from({ length: n }, (_, i) => paraBase36((i + 1) * passo, largura));
}

function paraBase36(valor: number, largura: number): string {
  let s = "";
  let v = valor;
  for (let i = 0; i < largura; i++) {
    s = ALFABETO[v % BASE]! + s;
    v = Math.floor(v / BASE);
  }
  return s;
}
