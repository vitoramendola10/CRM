import { describe, expect, it } from "vitest";
import { deMysql, diasCorridos, humanizarDias, paraMysql, somarDias, somarMinutos } from "@/lib/datas";

/**
 * Tudo que atravessa a fronteira do banco e string em UTC. O bug que este
 * arquivo existe para nao deixar voltar foi um tempo de ciclo NEGATIVO no
 * dashboard: a string do banco lida sem o "Z" vira horario local, e a conta sai
 * deslocada pelo fuso.
 */

describe("paraMysql e deMysql", () => {
  it("ida e volta preserva o instante", () => {
    const d = new Date("2026-03-15T18:42:07.250Z");
    expect(paraMysql(d)).toBe("2026-03-15 18:42:07.250");
    expect(deMysql(paraMysql(d)).getTime()).toBe(d.getTime());
  });

  it("le a string do banco como UTC, e nao como horario local", () => {
    // Sem o "Z" na leitura, isto daria diferenca de horas no fuso de Sao Paulo.
    expect(deMysql("2026-03-15 18:42:07.250").toISOString()).toBe("2026-03-15T18:42:07.250Z");
  });

  it("mantem os milissegundos", () => {
    expect(paraMysql(new Date("2026-01-01T00:00:00.007Z"))).toBe("2026-01-01 00:00:00.007");
  });
});

describe("somarDias e somarMinutos", () => {
  it("anda para frente e para tras sem tocar na base", () => {
    const base = new Date("2026-03-15T12:00:00.000Z");
    expect(somarDias(7, base).toISOString()).toBe("2026-03-22T12:00:00.000Z");
    expect(somarDias(-1, base).toISOString()).toBe("2026-03-14T12:00:00.000Z");
    expect(somarMinutos(90, base).toISOString()).toBe("2026-03-15T13:30:00.000Z");
    expect(base.toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });
});

describe("diasCorridos", () => {
  const abertura = "2026-03-01 10:00:00.000";

  it("conta dias inteiros passados", () => {
    expect(diasCorridos(abertura, new Date("2026-03-04T10:00:00Z"))).toBe(3);
    // Faltando uma hora para fechar o terceiro dia, ainda sao dois.
    expect(diasCorridos(abertura, new Date("2026-03-04T09:00:00Z"))).toBe(2);
  });

  it("sem data nao ha contagem", () => {
    expect(diasCorridos(null)).toBeNull();
  });

  it("nunca inventa dia no mesmo instante", () => {
    expect(diasCorridos(abertura, new Date("2026-03-01T10:00:00Z"))).toBe(0);
  });
});

describe("humanizarDias", () => {
  it("escreve como gente", () => {
    expect(humanizarDias(0)).toBe("hoje");
    expect(humanizarDias(-3)).toBe("hoje");
    expect(humanizarDias(1)).toBe("1 dia");
    expect(humanizarDias(14)).toBe("14 dias");
  });
});
