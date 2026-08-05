import { describe, expect, it } from "vitest";
import { criarLimitador, type ConfigLimite } from "@/lib/limite";

/**
 * O tempo entra injetado, entao nao ha fake timer nem espera de verdade: o
 * teste anda o relogio na mao e ve o limitador reagir.
 */

const CONFIG: ConfigLimite = {
  max: 3,
  janelaSegundos: 60,
  bloqueioSegundos: 30,
  bloqueioMaximoSegundos: 120,
};

function comRelogio(config: ConfigLimite = CONFIG) {
  let t = 1_000_000;
  const limitador = criarLimitador(config, () => t);
  return {
    limitador,
    avancar(segundos: number) {
      t += segundos * 1000;
    },
  };
}

describe("criarLimitador", () => {
  it("deixa passar ate o maximo e bloqueia a partir dai", () => {
    const { limitador } = comRelogio();

    for (let i = 0; i < CONFIG.max; i++) {
      expect(limitador.registrar("ip|joao").ok).toBe(true);
    }

    const bloqueado = limitador.registrar("ip|joao");
    expect(bloqueado.ok).toBe(false);
    if (!bloqueado.ok) expect(bloqueado.esperarSegundos).toBe(CONFIG.bloqueioSegundos);
  });

  it("conta cada chave por si", () => {
    const { limitador } = comRelogio();

    for (let i = 0; i < CONFIG.max + 1; i++) limitador.registrar("ip1|joao");
    // A cota de outra pessoa (ou de outro IP) nao foi tocada.
    expect(limitador.registrar("ip2|maria").ok).toBe(true);
  });

  it("libera quando a espera vence", () => {
    const { limitador, avancar } = comRelogio();

    for (let i = 0; i < CONFIG.max + 1; i++) limitador.registrar("ip|joao");
    expect(limitador.registrar("ip|joao").ok).toBe(false);

    avancar(CONFIG.bloqueioSegundos + 1);
    expect(limitador.registrar("ip|joao").ok).toBe(true);
  });

  it("desconta o tempo ja passado na resposta", () => {
    const { limitador, avancar } = comRelogio();

    for (let i = 0; i < CONFIG.max + 1; i++) limitador.registrar("ip|joao");
    avancar(20);

    const r = limitador.registrar("ip|joao");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.esperarSegundos).toBe(CONFIG.bloqueioSegundos - 20);
  });

  it("esquece o encadeamento de quem some por tempo suficiente", () => {
    const { limitador, avancar } = comRelogio();

    for (let i = 0; i < CONFIG.max + 1; i++) limitador.registrar("ip|joao");
    // Espera vencida e mais uma janela inteira sem aparecer: ficha limpa.
    avancar(CONFIG.bloqueioSegundos + CONFIG.janelaSegundos + 2);

    for (let i = 0; i < CONFIG.max; i++) limitador.registrar("ip|joao");
    const r = limitador.registrar("ip|joao");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.esperarSegundos).toBe(CONFIG.bloqueioSegundos);
  });

  it("dobra a espera a cada bloqueio encadeado, ate o teto", () => {
    const { limitador, avancar } = comRelogio();
    const esperas: number[] = [];

    for (let rodada = 0; rodada < 4; rodada++) {
      for (let i = 0; i < CONFIG.max; i++) limitador.registrar("ip|joao");
      const r = limitador.registrar("ip|joao");
      if (!r.ok) esperas.push(r.esperarSegundos);
      avancar(r.ok ? 0 : r.esperarSegundos + 1);
    }

    expect(esperas).toEqual([30, 60, 120, 120]);
  });

  it("a janela desliza: tentativas velhas nao contam", () => {
    const { limitador, avancar } = comRelogio();

    limitador.registrar("ip|joao");
    limitador.registrar("ip|joao");
    avancar(CONFIG.janelaSegundos + 1);

    // As duas primeiras envelheceram; a cota esta cheia de novo.
    for (let i = 0; i < CONFIG.max; i++) {
      expect(limitador.registrar("ip|joao").ok).toBe(true);
    }
  });

  it("zerar devolve a cota cheia e apaga o historico de bloqueio", () => {
    const { limitador } = comRelogio();

    for (let i = 0; i < CONFIG.max + 1; i++) limitador.registrar("ip|joao");
    limitador.zerar("ip|joao");

    for (let i = 0; i < CONFIG.max; i++) {
      expect(limitador.registrar("ip|joao").ok).toBe(true);
    }
    const r = limitador.registrar("ip|joao");
    expect(r.ok).toBe(false);
    // Voltou a espera inicial: quem provou a senha nao carrega a pena antiga.
    if (!r.ok) expect(r.esperarSegundos).toBe(CONFIG.bloqueioSegundos);
  });

  it("nao acumula chave morta no Map", () => {
    const { limitador, avancar } = comRelogio();

    for (let i = 0; i < 40; i++) limitador.registrar(`ip|usuario${i}`);
    expect(limitador.tamanho()).toBe(40);

    // Passada a janela, a varredura amortizada recolhe o que venceu.
    avancar(CONFIG.janelaSegundos * 2 + 1);
    limitador.registrar("ip|gatilho");
    expect(limitador.tamanho()).toBe(1);
  });
});
