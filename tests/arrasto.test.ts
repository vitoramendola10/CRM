// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { podeIniciarArrasto } from "@/components/kanban/useArrasto";

/**
 * A regra de onde o arrasto pode comecar - a que ja errou uma vez.
 *
 * A versao anterior barrava tambem `a`, para nao atrapalhar o clique no link.
 * So que o titulo do card e um link de largura inteira: o resultado foi uma
 * zona morta em cima do texto principal, e pegar o card pelo titulo (o gesto
 * mais obvio que existe) simplesmente nao fazia nada. Quem separa clique de
 * arrasto e a distancia percorrida, nao o tipo do elemento.
 */

function montar(html: string): HTMLElement {
  document.body.innerHTML = `<article class="card">${html}</article>`;
  return document.querySelector<HTMLElement>("article")!;
}

describe("podeIniciarArrasto", () => {
  it("deixa comecar no titulo, que e um link", () => {
    const card = montar('<a href="/kanban/1" id="titulo">Corrigir emissao</a>');
    expect(podeIniciarArrasto(card.querySelector("#titulo"))).toBe(true);
  });

  it("deixa comecar em texto dentro do link", () => {
    // O alvo do evento e o no mais interno, nao o <a>.
    const card = montar('<a href="/kanban/1"><span id="dentro">Corrigir</span></a>');
    expect(podeIniciarArrasto(card.querySelector("#dentro"))).toBe(true);
  });

  it("deixa comecar no corpo do card e nos textos soltos", () => {
    const card = montar('<span id="cliente">Padaria Estrela</span>');
    expect(podeIniciarArrasto(card)).toBe(true);
    expect(podeIniciarArrasto(card.querySelector("#cliente"))).toBe(true);
  });

  it("nao comeca em botao", () => {
    // Botao executa acao: ela nao pode nascer de um gesto de mover card.
    const card = montar('<button id="b">Escalar</button>');
    expect(podeIniciarArrasto(card.querySelector("#b"))).toBe(false);
  });

  it("nao comeca dentro de um botao", () => {
    const card = montar('<button><span id="dentro">Escalar</span></button>');
    expect(podeIniciarArrasto(card.querySelector("#dentro"))).toBe(false);
  });

  it("nao comeca em campo de formulario", () => {
    // Arrastar dentro de um input e como se seleciona texto nele.
    for (const tag of ["input", "select", "textarea"]) {
      const card = montar(`<${tag} id="c"></${tag}>`);
      expect(podeIniciarArrasto(card.querySelector("#c"))).toBe(false);
    }
  });

  it("alvo nulo nao inicia nada", () => {
    expect(podeIniciarArrasto(null)).toBe(false);
  });
});
