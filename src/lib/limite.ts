/**
 * Limitador de taxa por chave, em memoria do processo.
 *
 * A limitacao e real e vale dizer sem enfeite: o estado inteiro vive num Map
 * dentro deste processo Node. Na pratica isso significa que
 *
 * - reiniciar o servidor zera todos os contadores. Um deploy, um crash ou o
 *   proprio `npm run dev` recompilando devolvem a cota cheia a quem estava
 *   bloqueado;
 * - com mais de uma instancia atras de um balanceador cada uma conta o seu
 *   proprio bolo, entao N instancias valem N vezes o limite configurado;
 * - nao da para inspecionar nem auditar os bloqueios de fora do processo.
 *
 * Por que isso e aceitavel aqui: o CRM roda numa instancia unica, para uma
 * equipe de ~10 pessoas, e o que se quer e inviabilizar forca bruta online -
 * nao produzir trilha de auditoria. Quem consegue reiniciar o servidor para
 * limpar o contador ja tem acesso a maquina, e nesse ponto o limitador de
 * login e o menor dos problemas.
 *
 * O que mudaria se um dia rodar replicado: o Map vira armazenamento
 * compartilhado. Redis e o caminho natural (INCR + EXPIRE, ou um script Lua
 * para manter a janela deslizante num sorted set); sem Redis, da para usar uma
 * tabela `login_tentativas` (chave, instante) no MySQL que ja existe, com
 * DELETE do que venceu. A interface `Limitador` abaixo e sincrona so enquanto
 * for memoria: qualquer um dos dois destinos vai exigir torna-la assincrona.
 * Ela e de proposito o unico ponto de contato com o resto do codigo, para que
 * essa troca fique contida em um arquivo mais os `await` de quem chama.
 */

/** Janela deslizante: `max` tentativas a cada `janelaSegundos`. */
export interface ConfigLimite {
  /** Tentativas que passam dentro da janela antes de comecar o bloqueio. */
  max: number;
  /** Tamanho da janela deslizante, em segundos. */
  janelaSegundos: number;
  /** Espera imposta no primeiro bloqueio, em segundos. */
  bloqueioSegundos: number;
  /** Teto da espera, ja que ela dobra a cada bloqueio encadeado. */
  bloqueioMaximoSegundos: number;
}

export type ResultadoLimite =
  | { ok: true; restantes: number }
  | { ok: false; esperarSegundos: number };

export interface Limitador {
  /** Contabiliza uma tentativa e diz se ela passa. */
  registrar(chave: string): ResultadoLimite;
  /** Devolve a cota cheia a uma chave - o caso e o login que deu certo. */
  zerar(chave: string): void;
  /** Chaves vivas no momento. Existe para teste e diagnostico. */
  tamanho(): number;
}

interface Registro {
  /** Instantes das tentativas ainda dentro da janela. No maximo `max` itens. */
  tentativas: number[];
  /** Instante em que o bloqueio termina; 0 quando nao ha bloqueio. */
  bloqueadoAte: number;
  /** Bloqueios encadeados sem tregua. Cada um dobra a espera do proximo. */
  seguidos: number;
}

/** Nunca dizer "faltam 0 segundos": arredonda para cima e nunca abaixo de 1. */
function emSegundos(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * Escolhi janela deslizante com log de instantes, e nao token bucket nem janela
 * fixa. Com `max` na casa das unidades o log custa um array de 8 numeros por
 * chave, e em troca nao tem o efeito de borda da janela fixa (16 tentativas na
 * virada de dois blocos de 5 minutos) nem a recarga continua do bucket, que
 * dificultaria dizer ao usuario quantos segundos exatos faltam.
 *
 * `agora` e injetavel para que o teste controle o tempo sem fake timers.
 */
export function criarLimitador(
  config: ConfigLimite,
  agora: () => number = Date.now,
): Limitador {
  const mapa = new Map<string, Registro>();
  const janelaMs = config.janelaSegundos * 1000;
  let proximaVarredura = 0;

  /**
   * Quando a chave deixa de importar: nem tentativa na janela, nem bloqueio.
   *
   * Depois de um bloqueio a chave sobrevive mais uma janela inteira, e nao ate
   * o instante em que a espera vence. E o que torna o escalonamento previsivel:
   * sem essa sobrevida, o `seguidos` desaparecia ou nao conforme a varredura
   * (que roda no maximo uma vez por janela) tivesse passado no intervalo - dois
   * ataques identicos recebiam penas diferentes por acaso de agendamento.
   * Com ela a regra e uma frase: voltar dentro de uma janela apos a espera
   * dobra a pena; sumir por mais que isso devolve a ficha limpa.
   */
  function expiraEm(r: Registro): number {
    const ultima = r.tentativas[r.tentativas.length - 1] ?? 0;
    const aposBloqueio = r.bloqueadoAte > 0 ? r.bloqueadoAte + janelaMs : 0;
    return Math.max(ultima + janelaMs, aposBloqueio);
  }

  /**
   * Limpeza amortizada, no maximo uma vez por janela, carona na propria
   * chamada de `registrar`. De proposito nao ha setInterval: um timer segura
   * uma referencia no event loop e, com o recarregamento de modulos do Next em
   * dev, se acumularia um timer novo a cada edicao.
   */
  function varrer(t: number): void {
    if (t < proximaVarredura) return;
    proximaVarredura = t + janelaMs;
    for (const [chave, r] of mapa) {
      if (expiraEm(r) <= t) mapa.delete(chave);
    }
  }

  return {
    registrar(chave) {
      const t = agora();
      varrer(t);

      const reg = mapa.get(chave);
      if (reg && reg.bloqueadoAte > t) {
        // Tentar durante o bloqueio nao aumenta a pena: quem so errou o caps
        // lock costuma insistir algumas vezes antes de ler a mensagem.
        return { ok: false, esperarSegundos: emSegundos(reg.bloqueadoAte - t) };
      }

      const atual: Registro = reg ?? { tentativas: [], bloqueadoAte: 0, seguidos: 0 };
      // O deslizar da janela: o que envelheceu sai antes de contar.
      const inicio = t - janelaMs;
      atual.tentativas = atual.tentativas.filter((x) => x > inicio);

      if (atual.tentativas.length >= config.max) {
        atual.seguidos += 1;
        const espera = Math.min(
          config.bloqueioSegundos * 2 ** (atual.seguidos - 1),
          config.bloqueioMaximoSegundos,
        );
        atual.bloqueadoAte = t + espera * 1000;
        // A contagem recomeca depois da espera: a pena e o bloqueio. Manter o
        // log cheio faria o primeiro erro seguinte re-bloquear na hora, e o
        // "espere 1 minuto" viraria, na pratica, "espere a janela inteira".
        // Quem insiste nao escapa barato mesmo assim - a espera dobra.
        atual.tentativas = [];
        mapa.set(chave, atual);
        return { ok: false, esperarSegundos: espera };
      }

      atual.tentativas.push(t);
      mapa.set(chave, atual);
      return { ok: true, restantes: config.max - atual.tentativas.length };
    },

    zerar(chave) {
      // Apaga tambem os `seguidos`, e e o que se quer: quem provou saber a
      // senha nao carrega o historico de bloqueio para a proxima vez. Fora
      // isso, o contador de encadeamento se perde sozinho quando a chave
      // vence e sai do Map na varredura.
      mapa.delete(chave);
    },

    tamanho() {
      return mapa.size;
    },
  };
}
