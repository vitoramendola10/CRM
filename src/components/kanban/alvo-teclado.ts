import type { TaskCard } from "@/domain";
import type { GrupoDoQuadro } from "@/lib/agrupar";

/** Alt + seta -> para onde. O Alt e preciso: seta sozinha rola a pagina. */
export const DIRECAO = {
  ArrowLeft: "esquerda",
  ArrowRight: "direita",
  ArrowUp: "cima",
  ArrowDown: "baixo",
} as const;

export type Direcao = (typeof DIRECAO)[keyof typeof DIRECAO];

export interface AlvoDoMovimento {
  colunaId: string;
  /** Indice na lista da coluna JA SEM o proprio card - o que `soltar` espera. */
  indice: number;
  /** Texto do anuncio para leitor de tela. */
  aviso: string;
}

/**
 * Para onde o card vai quando alguem aperta Alt + seta.
 *
 * Fica fora do componente porque e a unica parte do movimento por teclado que
 * pode errar calada: um indice trocado nao quebra nada, so poe o card uma linha
 * fora do lugar - e isso ninguem liga a tecla que apertou meia hora antes.
 *
 * `null` significa "nao ha para onde ir" (ponta do board, topo ou fim da
 * coluna). Quem chama nao faz nada nesse caso, de proposito: bipar ou piscar a
 * cada tecla numa ponta cansa mais do que ajuda.
 */
export function alvoDoTeclado(
  grupos: readonly GrupoDoQuadro[],
  card: TaskCard,
  direcao: Direcao,
): AlvoDoMovimento | null {
  const iColuna = grupos.findIndex((g) => g.id === card.columnId);
  const grupo = grupos[iColuna];
  if (!grupo) return null;

  if (direcao === "esquerda" || direcao === "direita") {
    const alvo = grupos[iColuna + (direcao === "direita" ? 1 : -1)];
    if (!alvo) return null;
    // Entra no fim da coluna de destino. Manter a "mesma altura" seria adivinhar
    // uma intencao que o usuario nao expressou - e a coluna alvo tem outro tamanho.
    return {
      colunaId: alvo.id,
      indice: alvo.cards.length,
      aviso: `${card.assunto}: movido para ${alvo.nome}, no fim da coluna.`,
    };
  }

  const posicao = grupo.cards.findIndex((c) => c.id === card.id);
  if (posicao === -1) return null;

  const destino = posicao + (direcao === "baixo" ? 1 : -1);
  if (destino < 0 || destino >= grupo.cards.length) return null;

  /**
   * `soltar` remove o proprio card da lista antes de olhar os vizinhos. Sem o
   * card, quem estava em `posicao` some e todo mundo depois dele anda uma casa
   * para tras - o que faz `destino` valer na lista encurtada tanto para cima
   * quanto para baixo, sem correcao nenhuma.
   */
  return {
    colunaId: grupo.id,
    indice: destino,
    aviso: `${card.assunto}: posicao ${destino + 1} de ${grupo.cards.length} em ${grupo.nome}.`,
  };
}
