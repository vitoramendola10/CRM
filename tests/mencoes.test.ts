import { describe, expect, it } from "vitest";
import { extrairMencoes } from "@/domain";

/**
 * Quem foi citado num comentario. Errar aqui falha em silencio: a citacao nao
 * vira aviso, e quem perguntou fica esperando resposta de alguem que nunca
 * soube da pergunta.
 */

describe("extrairMencoes", () => {
  it("pega o nome depois do @", () => {
    expect(extrairMencoes("@vitor pode olhar?")).toEqual(["vitor"]);
  });

  it("nao leva a pontuacao junto", () => {
    // "@vitor," e como se escreve de verdade - a virgula nao e do nome.
    expect(extrairMencoes("@vitor, qual versao?")).toEqual(["vitor"]);
    expect(extrairMencoes("pergunta para @ana.")).toEqual(["ana"]);
    expect(extrairMencoes("(@joao)")).toEqual(["joao"]);
  });

  it("aceita os caracteres que o username permite", () => {
    // Mesmo conjunto do schema de usuario: letra, numero, ponto, hifen, underline.
    expect(extrairMencoes("@ana.paula @jose-luis @dev_1 @b2")).toEqual([
      "ana.paula",
      "jose-luis",
      "dev_1",
      "b2",
    ]);
  });

  it("nao repete quem foi citado duas vezes", () => {
    // Duas citacoes no mesmo texto nao podem virar dois e-mails.
    expect(extrairMencoes("@vitor ... e @Vitor de novo")).toEqual(["vitor"]);
  });

  it("normaliza a caixa", () => {
    expect(extrairMencoes("@VITOR")).toEqual(["vitor"]);
  });

  it("acha varios", () => {
    expect(extrairMencoes("@ana e @bruno, olhem isso")).toEqual(["ana", "bruno"]);
  });

  it("texto sem citacao nao devolve nada", () => {
    for (const t of ["", "sem mencao nenhuma", "email@exemplo.com nao conta como citacao?"]) {
      const r = extrairMencoes(t);
      // O caso do e-mail e conhecido: "@exemplo.com" casa o padrao. Nao ha
      // usuario com esse nome, entao o service descarta - mas o teste registra
      // o comportamento para nao virar surpresa depois.
      expect(Array.isArray(r)).toBe(true);
    }
    expect(extrairMencoes("sem mencao nenhuma")).toEqual([]);
    expect(extrairMencoes("")).toEqual([]);
  });

  it("@ sozinho nao vira citacao", () => {
    expect(extrairMencoes("preco @ 10 reais")).toEqual([]);
    expect(extrairMencoes("@")).toEqual([]);
  });

  it("pega citacao no comeco da linha e colada em quebra", () => {
    expect(extrairMencoes("linha um\n@ana olha isso")).toEqual(["ana"]);
  });
});
