import { describe, expect, it } from "vitest";
import { alcanca } from "@/lib/grafo";

/**
 * A trava de ciclo. O banco impede a rotina depender de si mesma (CHECK) e
 * impede a aresta repetida (chave composta), mas nao tem como ver A->B->C->A -
 * e um ciclo desses trava as tres rotinas para sempre, sem erro nenhum que
 * explique por que nada anda.
 */

const aresta = (taskId: string, dependeDeId: string) => ({ taskId, dependeDeId });

describe("alcanca", () => {
  it("chega no destino direto", () => {
    expect(alcanca([aresta("a", "b")], "a", "b")).toBe(true);
  });

  it("nao chega na direcao contraria", () => {
    // A aresta e dirigida: "a espera b" nao significa "b espera a".
    expect(alcanca([aresta("a", "b")], "b", "a")).toBe(false);
  });

  it("chega por caminho longo", () => {
    const g = [aresta("a", "b"), aresta("b", "c"), aresta("c", "d")];
    expect(alcanca(g, "a", "d")).toBe(true);
    expect(alcanca(g, "b", "d")).toBe(true);
    expect(alcanca(g, "d", "a")).toBe(false);
  });

  it("o proprio no se alcanca", () => {
    // E o que faz "DEV-7 depende de DEV-7" ser barrado pelo mesmo caminho.
    expect(alcanca([], "a", "a")).toBe(true);
  });

  it("grafo vazio nao alcanca nada", () => {
    expect(alcanca([], "a", "b")).toBe(false);
  });

  it("ramos paralelos nao confundem", () => {
    const g = [aresta("a", "b"), aresta("a", "c"), aresta("c", "d")];
    expect(alcanca(g, "a", "d")).toBe(true);
    expect(alcanca(g, "b", "d")).toBe(false);
  });

  /**
   * O caso que a funcao existe para responder: antes de gravar "x depende de
   * y", pergunta-se se y ja alcanca x. Se alcanca, fechar a aresta faria o
   * circulo.
   */
  it("detecta o circulo que a nova aresta fecharia", () => {
    const g = [aresta("a", "b"), aresta("b", "c")];
    // "c depende de a" fecharia a->b->c->a.
    expect(alcanca(g, "a", "c")).toBe(true);
    // "a depende de c" tambem: a ja alcanca c.
    expect(alcanca(g, "c", "a")).toBe(false);
  });

  /**
   * Se um ciclo ja existir no banco - import, SQL na mao, versao anterior sem
   * a trava - a propria busca nao pode entrar em loop infinito.
   */
  it("nao trava com ciclo ja existente", () => {
    const g = [aresta("a", "b"), aresta("b", "c"), aresta("c", "a")];
    expect(alcanca(g, "a", "c")).toBe(true);
    expect(alcanca(g, "a", "z")).toBe(false);
  });

  it("aguenta grafo grande sem repetir trabalho", () => {
    // Cadeia de 2000 nos: sem o conjunto de visitados isto nao terminaria.
    const g = Array.from({ length: 2000 }, (_, i) => aresta(`n${i}`, `n${i + 1}`));
    expect(alcanca(g, "n0", "n2000")).toBe(true);
    expect(alcanca(g, "n0", "fora")).toBe(false);
  });
});
