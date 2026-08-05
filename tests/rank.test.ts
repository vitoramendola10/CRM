import { describe, expect, it } from "vitest";
import { RANK_INICIAL, rankEntre, rankValido, ranksDistribuidos } from "@/lib/rank";

/**
 * O rank e o que sustenta a ordem do Kanban. Um erro aqui nao estoura em lugar
 * nenhum: o card so aparece na posicao errada depois, e ninguem liga uma coisa
 * a outra. Por isso o teste cobre a propriedade ("fica no meio, sempre"), e nao
 * so alguns casos escolhidos a dedo.
 */

describe("rankEntre", () => {
  it("devolve algo estritamente entre os vizinhos", () => {
    const r = rankEntre("a", "c");
    expect(r > "a").toBe(true);
    expect(r < "c").toBe(true);
  });

  it("trata null como topo e como fim da coluna", () => {
    expect(rankEntre(null, "b") < "b").toBe(true);
    expect(rankEntre("b", null) > "b").toBe(true);
    expect(rankValido(rankEntre(null, null))).toBe(true);
  });

  it("cabe entre vizinhos colados, esticando a string", () => {
    const r = rankEntre("a", "b");
    expect(r > "a").toBe(true);
    expect(r < "b").toBe(true);
    expect(r.length).toBeGreaterThan(1);
  });

  it("recusa intervalo invertido ou degenerado", () => {
    expect(() => rankEntre("c", "a")).toThrow();
    expect(() => rankEntre("a", "a")).toThrow();
  });

  it("so devolve rank valido", () => {
    expect(rankValido(RANK_INICIAL)).toBe(true);
    expect(rankValido(rankEntre("a", "b"))).toBe(true);
    expect(rankValido("")).toBe(false);
    expect(rankValido("A")).toBe(false); // maiuscula nao esta no alfabeto
    expect(rankValido("a!")).toBe(false);
  });

  /**
   * O caso que quebra na vida real: arrastar cem vezes para a mesma posicao.
   * Cada insercao no mesmo ponto consome comprimento de string. O que se exige
   * aqui nao e que nunca acabe - e que a ordem nunca se perca antes de acabar.
   */
  it("mantem a ordem em insercoes repetidas no mesmo ponto", () => {
    let anterior = rankEntre("a", "b");
    for (let i = 0; i < 100; i++) {
      const novo = rankEntre("a", anterior);
      expect(novo > "a").toBe(true);
      expect(novo < anterior).toBe(true);
      anterior = novo;
    }
  });

  it("avisa em vez de devolver lixo quando o intervalo se esgota", () => {
    let a = "a";
    const b = "b";
    let estourou = false;
    for (let i = 0; i < 400; i++) {
      try {
        a = rankEntre(a, b);
      } catch {
        estourou = true;
        break;
      }
    }
    // Esgotar e legitimo; devolver rank fora do intervalo nao seria.
    expect(estourou).toBe(true);
  });
});

describe("ranksDistribuidos", () => {
  it("nao devolve nada para quantidade nao positiva", () => {
    expect(ranksDistribuidos(0)).toEqual([]);
    expect(ranksDistribuidos(-3)).toEqual([]);
  });

  it("devolve a quantidade pedida, em ordem crescente e valida", () => {
    for (const n of [1, 2, 7, 50, 500]) {
      const ranks = ranksDistribuidos(n);
      expect(ranks).toHaveLength(n);
      expect(ranks.every(rankValido)).toBe(true);
      expect([...ranks].sort()).toEqual(ranks);
      expect(new Set(ranks).size).toBe(n);
    }
  });

  /**
   * A razao de existir da funcao: reindexar tem que devolver folga, senao a
   * coluna reindexada satura de novo nas proximas insercoes. Entre dois ranks
   * consecutivos precisa caber outro - e mais de um.
   */
  it("deixa folga entre cada par de ranks", () => {
    const ranks = ranksDistribuidos(30);
    for (let i = 1; i < ranks.length; i++) {
      const a = ranks[i - 1]!;
      const b = ranks[i]!;
      let meio = rankEntre(a, b);
      // Tres insercoes seguidas no mesmo vao sem esticar alem do razoavel.
      for (let k = 0; k < 3; k++) {
        expect(meio > a).toBe(true);
        expect(meio < b).toBe(true);
        meio = rankEntre(a, meio);
      }
    }
  });
});
