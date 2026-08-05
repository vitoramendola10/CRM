import { describe, expect, it } from "vitest";
import { alvoDoTeclado } from "@/components/kanban/alvo-teclado";
import type { TaskCard } from "@/domain";
import type { GrupoDoQuadro } from "@/lib/agrupar";

/**
 * Mover card pelo teclado. O indice devolvido e o da lista JA SEM o proprio
 * card, porque e assim que o `soltar` do Quadro calcula os vizinhos; errar isso
 * poe o card uma linha fora do lugar sem quebrar nada - o tipo de defeito que
 * ninguem consegue reproduzir depois.
 */

function card(id: string, columnId: string): TaskCard {
  return {
    id,
    codigo: 1,
    solicitacao: null,
    assunto: id,
    cliente: null,
    clienteId: null,
    responsavel: null,
    status: { nome: "Aberto", cor: "#888", categoria: "aberto" },
    inicio: null,
    prazo: null,
    prioridade: "media",
    etiquetas: [],
    estimativaH: null,
    bloqueios: 0,
    columnId,
    rank: "a",
  };
}

function grupo(id: string, nome: string, cards: TaskCard[]): GrupoDoQuadro {
  return { id, nome, cor: "#888", wipLimit: null, cards };
}

const A = [card("a1", "c1"), card("a2", "c1"), card("a3", "c1")];
const B = [card("b1", "c2")];
const GRUPOS = [grupo("c1", "Backlog", A), grupo("c2", "Fazendo", B), grupo("c3", "Feito", [])];

describe("alvoDoTeclado na horizontal", () => {
  it("entra no fim da coluna vizinha", () => {
    const r = alvoDoTeclado(GRUPOS, A[0]!, "direita");
    expect(r).toMatchObject({ colunaId: "c2", indice: 1 });
  });

  it("chega em coluna vazia no indice zero", () => {
    const r = alvoDoTeclado(GRUPOS, B[0]!, "direita");
    expect(r).toMatchObject({ colunaId: "c3", indice: 0 });
  });

  it("volta para a coluna anterior", () => {
    const r = alvoDoTeclado(GRUPOS, B[0]!, "esquerda");
    expect(r).toMatchObject({ colunaId: "c1", indice: 3 });
  });

  it("nao sai do board pelas pontas", () => {
    expect(alvoDoTeclado(GRUPOS, A[0]!, "esquerda")).toBeNull();
    expect(alvoDoTeclado(GRUPOS, card("x", "c3"), "direita")).toBeNull();
  });
});

describe("alvoDoTeclado na vertical", () => {
  it("desce uma posicao", () => {
    // a1 esta em 0; descendo, na lista sem ele o destino e o indice 1.
    expect(alvoDoTeclado(GRUPOS, A[0]!, "baixo")).toMatchObject({ colunaId: "c1", indice: 1 });
  });

  it("sobe uma posicao", () => {
    expect(alvoDoTeclado(GRUPOS, A[2]!, "cima")).toMatchObject({ colunaId: "c1", indice: 1 });
  });

  it("nao passa do topo nem do fim da coluna", () => {
    expect(alvoDoTeclado(GRUPOS, A[0]!, "cima")).toBeNull();
    expect(alvoDoTeclado(GRUPOS, A[2]!, "baixo")).toBeNull();
    // Card sozinho na coluna nao tem para onde ir na vertical.
    expect(alvoDoTeclado(GRUPOS, B[0]!, "cima")).toBeNull();
    expect(alvoDoTeclado(GRUPOS, B[0]!, "baixo")).toBeNull();
  });

  /**
   * A propriedade que interessa: descer e subir de volta tem que devolver o card
   * ao lugar de onde saiu. Simula o que `soltar` faz - tira o card, insere no
   * indice - e confere que a lista volta identica.
   */
  it("descer e subir devolve a ordem original", () => {
    for (let inicio = 0; inicio < A.length; inicio++) {
      const desce = alvoDoTeclado(GRUPOS, A[inicio]!, "baixo");
      if (!desce) continue;

      const movida = aplicar(A, A[inicio]!.id, desce.indice);
      const depois = [grupo("c1", "Backlog", movida), ...GRUPOS.slice(1)];
      const sobe = alvoDoTeclado(depois, A[inicio]!, "cima");
      expect(sobe).not.toBeNull();

      expect(aplicar(movida, A[inicio]!.id, sobe!.indice).map((c) => c.id)).toEqual(
        A.map((c) => c.id),
      );
    }
  });
});

/** Mesma conta do `soltar`: tira o card da lista e reinsere no indice pedido. */
function aplicar(cards: TaskCard[], id: string, indice: number): TaskCard[] {
  const alvo = cards.find((c) => c.id === id)!;
  const sem = cards.filter((c) => c.id !== id);
  return [...sem.slice(0, indice), alvo, ...sem.slice(indice)];
}

describe("alvoDoTeclado com card fora do board", () => {
  it("ignora card cuja coluna nao esta na visao", () => {
    expect(alvoDoTeclado(GRUPOS, card("z", "coluna-de-outro-board"), "direita")).toBeNull();
  });

  it("ignora card que sumiu da coluna entre o render e a tecla", () => {
    expect(alvoDoTeclado(GRUPOS, card("fantasma", "c1"), "baixo")).toBeNull();
  });
});
