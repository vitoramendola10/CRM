/**
 * O `@` que a pessoa esta digitando AGORA, para oferecer os nomes.
 *
 * Separado do `extrairMencoes` do dominio de proposito: aquele le um texto
 * pronto e diz quem foi citado; este olha a posicao do cursor no meio da
 * digitacao e diz se ha uma citacao em construcao ali.
 */

export interface TokenDeMencao {
  /** Posicao do `@` no texto. E por onde a substituicao comeca. */
  inicio: number;
  /** O que foi digitado depois do `@`, ainda sem confirmar. */
  termo: string;
}

/** Mesmo conjunto que o username aceita: letra, numero, ponto, hifen, underline. */
const CARACTERE = /[a-zA-Z0-9._-]/;

/**
 * Ha uma citacao sendo escrita na posicao do cursor?
 *
 * Anda para tras a partir do cursor enquanto houver caractere valido de nome.
 * Se parar num `@` que esta no comeco do texto ou depois de um espaco, e uma
 * citacao. O `@` colado em outra coisa nao conta - senao todo e-mail digitado
 * ("fulano@empresa.com") abriria a lista de nomes no meio da frase.
 */
export function tokenDeMencao(texto: string, cursor: number): TokenDeMencao | null {
  let i = cursor;
  while (i > 0 && CARACTERE.test(texto[i - 1]!)) i--;

  // Antes do trecho digitado tem de haver um `@`...
  if (i === 0 || texto[i - 1] !== "@") return null;
  const arroba = i - 1;

  // ...e o `@` so vale no inicio do texto ou depois de espaco/quebra de linha.
  if (arroba > 0 && !/\s/.test(texto[arroba - 1]!)) return null;

  return { inicio: arroba, termo: texto.slice(i, cursor) };
}

/** Troca a citacao em construcao pelo nome escolhido e devolve onde fica o cursor. */
export function aplicarMencao(
  texto: string,
  token: TokenDeMencao,
  username: string,
): { texto: string; cursor: number } {
  const fim = token.inicio + 1 + token.termo.length;
  // Espaco depois do nome: quem escolheu da lista vai continuar escrevendo, e
  // ter de apertar espaco antes e um atrito que ninguem espera.
  const novo = `@${username} `;
  return {
    texto: texto.slice(0, token.inicio) + novo + texto.slice(fim),
    cursor: token.inicio + novo.length,
  };
}

/**
 * Nomes que combinam com o que ja foi digitado. Termo vazio devolve todos -
 * apertar `@` sozinho e justamente a forma de perguntar "quem existe?".
 */
export function filtrarNomes(usernames: readonly string[], termo: string): string[] {
  const t = termo.toLowerCase();
  if (t === "") return [...usernames];
  return usernames.filter((u) => u.toLowerCase().startsWith(t));
}
