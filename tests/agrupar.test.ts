import { describe, expect, it } from "vitest";
import type { BoardColumn, Etiqueta, TaskCard } from "@/domain";
import { agruparCards } from "@/lib/agrupar";

/**
 * O agrupamento decide o que aparece em cada coluna do board. As regras que
 * importam - e que sao faceis de quebrar sem perceber - sao tres: coluna vazia
 * continua existindo no eixo "etapa" (senao nao da para arrastar nada para
 * dentro dela), card com N etiquetas aparece N vezes, e o que esta sem
 * responsavel/cliente vai para uma coluna propria no fim.
 */

const COLUNAS: BoardColumn[] = [
  { id: "c1", boardId: "b", nome: "Backlog", ordem: 1, cor: "#888", wipLimit: null, isDone: false },
  { id: "c2", boardId: "b", nome: "Fazendo", ordem: 2, cor: "#888", wipLimit: 3, isDone: false },
  { id: "c3", boardId: "b", nome: "Feito", ordem: 3, cor: "#888", wipLimit: null, isDone: true },
];

const ETIQUETA: Record<string, Etiqueta> = {
  bug: { id: "e1", nome: "Bug", cor: "#c00", ativo: true },
  urgente: { id: "e2", nome: "Urgente", cor: "#f80", ativo: true },
};

function card(p: Partial<TaskCard> & { id: string; rank: string; columnId: string }): TaskCard {
  return {
    codigo: 1,
    solicitacao: null,
    assunto: "Assunto",
    cliente: null,
    clienteId: null,
    responsavel: null,
    status: { nome: "Aberto", cor: "#888", categoria: "aberto" },
    inicio: null,
    prazo: null,
    prioridade: "media",
    etiquetas: [],
    ...p,
  };
}

describe("agruparCards por etapa", () => {
  it("mantem as colunas do banco, na ordem, inclusive as vazias", () => {
    const grupos = agruparCards([card({ id: "t1", rank: "b", columnId: "c2" })], COLUNAS, "etapa");

    expect(grupos.map((g) => g.id)).toEqual(["c1", "c2", "c3"]);
    expect(grupos.map((g) => g.cards.length)).toEqual([0, 1, 0]);
  });

  it("preserva o wipLimit da coluna", () => {
    const grupos = agruparCards([], COLUNAS, "etapa");
    expect(grupos.map((g) => g.wipLimit)).toEqual([null, 3, null]);
  });

  it("ordena os cards por rank, nao pela ordem de chegada", () => {
    const cards = [
      card({ id: "t3", rank: "c", columnId: "c1" }),
      card({ id: "t1", rank: "a", columnId: "c1" }),
      card({ id: "t2", rank: "b", columnId: "c1" }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "etapa");
    expect(grupos[0]!.cards.map((c) => c.id)).toEqual(["t1", "t2", "t3"]);
  });
});

describe("agruparCards por prioridade", () => {
  it("vai da mais urgente para a menos e some com as vazias", () => {
    const cards = [
      card({ id: "t1", rank: "a", columnId: "c1", prioridade: "baixa" }),
      card({ id: "t2", rank: "b", columnId: "c1", prioridade: "urgente" }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "prioridade");

    expect(grupos.map((g) => g.cards[0]?.id)).toEqual(["t2", "t1"]);
    // "alta" e "media" nao tem card e por isso nao viram coluna.
    expect(grupos).toHaveLength(2);
  });
});

describe("agruparCards por etiqueta", () => {
  it("repete o card em cada etiqueta dele", () => {
    const cards = [
      card({
        id: "t1",
        rank: "a",
        columnId: "c1",
        etiquetas: [ETIQUETA.bug!, ETIQUETA.urgente!],
      }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "etiqueta");

    expect(grupos.map((g) => g.nome)).toEqual(["Bug", "Urgente"]);
    // A soma das colunas passa do total de cards - e o esperado num N:N.
    expect(grupos.reduce((n, g) => n + g.cards.length, 0)).toBe(2);
  });

  it("junta o que nao tem etiqueta numa coluna no fim", () => {
    const cards = [
      card({ id: "t1", rank: "a", columnId: "c1", etiquetas: [ETIQUETA.bug!] }),
      card({ id: "t2", rank: "b", columnId: "c1" }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "etiqueta");

    expect(grupos.at(-1)!.nome).toBe("Sem etiqueta");
    expect(grupos.at(-1)!.cards.map((c) => c.id)).toEqual(["t2"]);
  });
});

describe("agruparCards por responsavel e cliente", () => {
  it("ordena por nome e deixa os orfaos por ultimo", () => {
    const cards = [
      card({ id: "t1", rank: "a", columnId: "c1", responsavel: { id: "u2", nome: "Zeca" } }),
      card({ id: "t2", rank: "b", columnId: "c1" }),
      card({ id: "t3", rank: "c", columnId: "c1", responsavel: { id: "u1", nome: "Ana" } }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "responsavel");

    expect(grupos.map((g) => g.nome)).toEqual(["Ana", "Zeca", "Sem responsavel"]);
  });

  it("agrupa cliente pelo id, nao pelo nome exibido", () => {
    const cards = [
      card({ id: "t1", rank: "a", columnId: "c1", clienteId: "cl1", cliente: "Acme" }),
      card({ id: "t2", rank: "b", columnId: "c1", clienteId: "cl1", cliente: "Acme" }),
      card({ id: "t3", rank: "c", columnId: "c1", clienteId: "cl2", cliente: "Acme" }),
    ];
    const grupos = agruparCards(cards, COLUNAS, "cliente");

    // Dois clientes distintos de razao social igual continuam separados.
    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.cards.length).sort()).toEqual([1, 2]);
  });
});
