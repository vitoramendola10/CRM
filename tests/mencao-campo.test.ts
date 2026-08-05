import { describe, expect, it } from "vitest";
import { aplicarMencao, filtrarNomes, tokenDeMencao } from "@/lib/mencao";

/**
 * A lista de nomes que aparece enquanto se digita. Errar aqui nao quebra nada
 * visivel - so faz a lista abrir na hora errada, ou nao abrir na hora certa, e
 * a pessoa volta a ter de decorar os nomes de usuario.
 */

describe("tokenDeMencao", () => {
  it("acha a citacao sendo escrita no fim do texto", () => {
    expect(tokenDeMencao("fala @sup", 9)).toEqual({ inicio: 5, termo: "sup" });
  });

  it("acha o @ sozinho, que e como se pergunta 'quem existe?'", () => {
    expect(tokenDeMencao("fala @", 6)).toEqual({ inicio: 5, termo: "" });
  });

  it("acha no comeco do texto", () => {
    expect(tokenDeMencao("@ana", 4)).toEqual({ inicio: 0, termo: "ana" });
  });

  it("acha no meio, com o cursor dentro do nome", () => {
    // Cursor depois de "@su", antes de "porte1".
    expect(tokenDeMencao("oi @suporte1 tudo bem", 6)).toEqual({ inicio: 3, termo: "su" });
  });

  it("nao abre em e-mail digitado", () => {
    // O caso que mais atrapalharia: a lista pulando no meio de um e-mail.
    expect(tokenDeMencao("manda para fulano@empresa", 25)).toBeNull();
  });

  it("nao abre quando o cursor esta longe do @", () => {
    expect(tokenDeMencao("@ana escreveu isso", 18)).toBeNull();
  });

  it("nao abre sem @ nenhum", () => {
    expect(tokenDeMencao("texto comum", 11)).toBeNull();
    expect(tokenDeMencao("", 0)).toBeNull();
  });

  it("aceita quebra de linha antes do @", () => {
    expect(tokenDeMencao("linha um\n@ana", 13)).toEqual({ inicio: 9, termo: "ana" });
  });

  it("para no espaco: nao engole a palavra anterior", () => {
    expect(tokenDeMencao("@ana e @bru", 11)).toEqual({ inicio: 7, termo: "bru" });
  });
});

describe("aplicarMencao", () => {
  it("troca o que estava sendo digitado pelo nome inteiro", () => {
    const token = tokenDeMencao("fala @sup", 9)!;
    expect(aplicarMencao("fala @sup", token, "Suporte1")).toEqual({
      texto: "fala @Suporte1 ",
      cursor: 15,
    });
  });

  it("preserva o que vem depois do cursor", () => {
    const texto = "oi @su tudo bem";
    const token = tokenDeMencao(texto, 6)!;
    expect(aplicarMencao(texto, token, "Suporte1").texto).toBe("oi @Suporte1  tudo bem");
  });

  it("completa o @ sozinho", () => {
    const token = tokenDeMencao("@", 1)!;
    expect(aplicarMencao("@", token, "admin")).toEqual({ texto: "@admin ", cursor: 7 });
  });
});

describe("filtrarNomes", () => {
  const nomes = ["admin", "Suporte1", "Suporte2"];

  it("termo vazio mostra todo mundo", () => {
    expect(filtrarNomes(nomes, "")).toEqual(nomes);
  });

  it("filtra pelo comeco, sem ligar para maiuscula", () => {
    expect(filtrarNomes(nomes, "sup")).toEqual(["Suporte1", "Suporte2"]);
    expect(filtrarNomes(nomes, "SUPORTE2")).toEqual(["Suporte2"]);
    expect(filtrarNomes(nomes, "ad")).toEqual(["admin"]);
  });

  it("nao casa no meio do nome", () => {
    // "porte" nao deve trazer Suporte1: quem digita @ espera comecar o nome.
    expect(filtrarNomes(nomes, "porte")).toEqual([]);
  });

  it("sem correspondencia devolve vazio", () => {
    expect(filtrarNomes(nomes, "zzz")).toEqual([]);
  });
});
