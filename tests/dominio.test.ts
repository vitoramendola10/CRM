import { describe, expect, it } from "vitest";
import type { BoardColumn } from "@/domain";
import {
  PAPEIS,
  ROTAS,
  SITUACOES_FECHADAS,
  SITUACOES_TICKET,
  categoriaDaColuna,
  podeAcessar,
  situacaoEhFechada,
} from "@/domain";

/**
 * Duas regras que o resto do sistema le como verdade e que nao tem nenhum
 * alarme proprio: quem entra em cada area, e o que significa a posicao de uma
 * coluna do board. A segunda e uma INTERPRETACAO - a coluna nao guarda
 * categoria, ela e deduzida da ordem. O teste existe para fixar essa leitura
 * por escrito, e nao so no comentario.
 */

function coluna(id: string, ordem: number, isDone = false): Pick<BoardColumn, "id" | "ordem" | "isDone"> {
  return { id, ordem, isDone };
}

describe("podeAcessar", () => {
  it("libera Kanban e atendimentos para todo papel", () => {
    for (const papel of PAPEIS) {
      expect(podeAcessar(papel, ROTAS.kanban)).toBe(true);
      expect(podeAcessar(papel, ROTAS.atendimentos)).toBe(true);
    }
  });

  it("guarda dashboard e configuracao", () => {
    expect(podeAcessar("suporte", ROTAS.dashboard)).toBe(false);
    expect(podeAcessar("dev", ROTAS.dashboard)).toBe(false);
    expect(podeAcessar("gestor", ROTAS.dashboard)).toBe(true);
    expect(podeAcessar("admin", ROTAS.config)).toBe(true);
    expect(podeAcessar("suporte", ROTAS.config)).toBe(false);
  });

  it("aplica a regra da area as sub-rotas", () => {
    // O caso que motivou mover o cadastro de clientes para dentro de /config.
    expect(podeAcessar("suporte", "/config/clientes")).toBe(false);
    expect(podeAcessar("gestor", "/config/clientes")).toBe(true);
  });

  it("deixa a conta aberta a todo papel", () => {
    for (const papel of PAPEIS) {
      expect(podeAcessar(papel, ROTAS.conta)).toBe(true);
    }
  });

  it("nao confunde prefixo com area", () => {
    // "/configuracoes-antigas" comeca com "/config" mas nao e sub-rota dele.
    expect(podeAcessar("suporte", "/configuracoes-antigas")).toBe(true);
  });
});

describe("situacaoEhFechada", () => {
  it("resolvido e cancelado encerram o chamado", () => {
    expect(situacaoEhFechada("resolvido")).toBe(true);
    expect(situacaoEhFechada("cancelado")).toBe(true);
  });

  it("todo o resto e chamado vivo", () => {
    for (const s of ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_dev"] as const) {
      expect(situacaoEhFechada(s)).toBe(false);
    }
  });

  /**
   * Isto decide se `fechado_em` recebe carimbo, e por consequencia o que entra
   * no tempo medio de atendimento. Esquecer "cancelado" na conta e o jeito
   * classico de um indicador ficar otimista sem ninguem notar - o teste existe
   * para uma situacao nova nao entrar sem alguem decidir de que lado ela fica.
   */
  it("toda situacao esta classificada de um lado ou do outro", () => {
    const fechadas = SITUACOES_TICKET.filter(situacaoEhFechada);
    expect(fechadas).toEqual([...SITUACOES_FECHADAS]);
    expect(SITUACOES_TICKET).toHaveLength(6);
  });
});

describe("categoriaDaColuna", () => {
  const todas = [coluna("c1", 1), coluna("c2", 2), coluna("c3", 3), coluna("c4", 4, true)];

  it("a primeira coluna e a fila de entrada", () => {
    expect(categoriaDaColuna(coluna("c1", 1), todas)).toBe("aberto");
  });

  it("tudo entre a primeira e a de entrega e andamento", () => {
    expect(categoriaDaColuna(coluna("c2", 2), todas)).toBe("andamento");
    expect(categoriaDaColuna(coluna("c3", 3), todas)).toBe("andamento");
  });

  it("isDone vence a posicao", () => {
    expect(categoriaDaColuna(coluna("c4", 4, true), todas)).toBe("concluido");
    // Ate se a marcada como entrega for a primeira do board.
    const so = [coluna("unica", 1, true)];
    expect(categoriaDaColuna(so[0]!, so)).toBe("concluido");
  });

  it("e a menor ordem que manda, nao a posicao no array", () => {
    const fora = [coluna("b", 5), coluna("a", 2), coluna("c", 9)];
    expect(categoriaDaColuna(coluna("a", 2), fora)).toBe("aberto");
    expect(categoriaDaColuna(coluna("b", 5), fora)).toBe("andamento");
  });
});
