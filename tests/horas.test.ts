import { describe, expect, it } from "vitest";
import { formatarMinutos, paraMinutos } from "@/lib/horas";

/**
 * Como o tempo digitado vira minutos. Errar aqui nao quebra nada: so grava um
 * numero errado, que aparece meses depois no relatorio de horas por cliente -
 * quando ja nao ha como saber quanto foi de fato.
 */

describe("paraMinutos", () => {
  it("numero solto e HORA, nao minuto", () => {
    // A leitura que quase todo mundo faz. Quem quer dois minutos escreve "2m".
    expect(paraMinutos("2")).toBe(120);
    expect(paraMinutos("1")).toBe(60);
    expect(paraMinutos("1.5")).toBe(90);
    expect(paraMinutos("1,5")).toBe(90);
  });

  it("aceita as formas que as pessoas escrevem", () => {
    expect(paraMinutos("1h30")).toBe(90);
    expect(paraMinutos("1h")).toBe(60);
    expect(paraMinutos("1h 30m")).toBe(90);
    expect(paraMinutos("1:30")).toBe(90);
    expect(paraMinutos("45m")).toBe(45);
    expect(paraMinutos("0:45")).toBe(45);
  });

  it("nao liga para espaco nem maiuscula", () => {
    expect(paraMinutos("  2H30  ")).toBe(150);
    expect(paraMinutos("45M")).toBe(45);
  });

  it("recusa o que nao consegue ler", () => {
    // Devolver null e o certo: chutar um numero aqui gravaria hora inventada.
    for (const t of ["", "   ", "abc", "1h70x", "--", "1h30m45s", "1:75"]) {
      expect(paraMinutos(t)).toBeNull();
    }
  });

  it("horas longas continuam valendo", () => {
    expect(paraMinutos("8")).toBe(480);
    expect(paraMinutos("12:15")).toBe(735);
  });
});

describe("formatarMinutos", () => {
  it("abaixo de uma hora fica em minutos", () => {
    expect(formatarMinutos(45)).toBe("45min");
    expect(formatarMinutos(1)).toBe("1min");
  });

  it("hora cheia nao mostra os minutos", () => {
    expect(formatarMinutos(60)).toBe("1h");
    expect(formatarMinutos(480)).toBe("8h");
  });

  it("quebra com dois digitos, para alinhar na coluna", () => {
    expect(formatarMinutos(90)).toBe("1h30");
    expect(formatarMinutos(65)).toBe("1h05");
  });

  it("ida e volta preserva o valor", () => {
    for (const m of [1, 45, 60, 65, 90, 480, 735]) {
      expect(paraMinutos(formatarMinutos(m).replace("min", "m"))).toBe(m);
    }
  });
});
