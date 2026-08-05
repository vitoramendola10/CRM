import { describe, expect, it } from "vitest";
import { contem } from "@/db/queries/like";
import { POR_PAGINA, montarPagina, paginaDaUrl, pularDe } from "@/lib/paginacao";

/**
 * As duas pecas que ficam entre o que o usuario digita na URL e a consulta.
 * Nenhuma das duas fala com o banco, entao dao para testar direto.
 */

describe("contem", () => {
  it("envolve o termo em curinga", () => {
    expect(contem("acme")).toBe("%acme%");
  });

  it("neutraliza os curingas digitados pelo usuario", () => {
    // Sem escape, isto casaria a tabela inteira.
    expect(contem("%")).toBe("%\\%%");
    // E isto casaria "1000000" numa busca por "100_00".
    expect(contem("100_00")).toBe("%100\\_00%");
  });

  it("escapa a barra invertida antes dos curingas", () => {
    // Se a ordem se invertesse, o `\` inserido pelo escape do `%` seria
    // reescapado e o padrao procuraria por uma barra literal.
    expect(contem("a\\b")).toBe("%a\\\\b%");
    expect(contem("\\%")).toBe("%\\\\\\%%");
  });

  it("nao mexe no que nao e curinga", () => {
    expect(contem("Jose da Silva & Cia")).toBe("%Jose da Silva & Cia%");
  });
});

describe("paginaDaUrl", () => {
  it("aceita numero de pagina de verdade", () => {
    expect(paginaDaUrl("3")).toBe(3);
  });

  it("cai na primeira pagina diante de qualquer coisa estranha", () => {
    // Tudo isto chega de URL editada na mao ou de link velho.
    for (const bruto of [undefined, "", "0", "-2", "abc", "1.5", "1e3", " ", "99999999999999999999"]) {
      const p = paginaDaUrl(bruto);
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(1);
    }
    expect(paginaDaUrl("0")).toBe(1);
    expect(paginaDaUrl("-2")).toBe(1);
    expect(paginaDaUrl("abc")).toBe(1);
  });
});

describe("pularDe", () => {
  it("a primeira pagina nao pula nada", () => {
    expect(pularDe(1)).toBe(0);
  });

  it("pula um bloco inteiro por pagina", () => {
    expect(pularDe(2)).toBe(POR_PAGINA);
    expect(pularDe(4)).toBe(POR_PAGINA * 3);
  });
});

describe("montarPagina", () => {
  it("lista vazia ainda e uma pagina", () => {
    const p = montarPagina([], 0, 1);
    expect(p.paginas).toBe(1);
    expect(p.total).toBe(0);
  });

  it("arredonda para cima: a sobra ocupa uma pagina inteira", () => {
    expect(montarPagina([], POR_PAGINA, 1).paginas).toBe(1);
    expect(montarPagina([], POR_PAGINA + 1, 1).paginas).toBe(2);
    expect(montarPagina([], POR_PAGINA * 3, 1).paginas).toBe(3);
  });

  it("total e o do banco, nao o tamanho da fatia", () => {
    const p = montarPagina([1, 2, 3], 137, 2);
    expect(p.itens).toHaveLength(3);
    expect(p.total).toBe(137);
    expect(p.pagina).toBe(2);
  });
});
