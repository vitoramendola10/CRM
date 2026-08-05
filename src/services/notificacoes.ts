import type { Tx } from "@/db/client";
import { emailsDoPapel, emailsDosIds, enfileirar, regrasDoEvento } from "@/db/queries/notifications";
import type { EventoNotificacao } from "@/domain";
import { preencher, type Contexto } from "@/lib/template";

/**
 * Resolve as regras de um evento e grava o resultado no outbox, SEMPRE dentro da
 * transacao de quem chamou. Nada de e-mail aqui: se o request falhar depois,
 * a notificacao tem de sumir junto - e um e-mail enviado nao volta atras.
 */

export type { Contexto };

export interface Alvo {
  evento: EventoNotificacao;
  boardId: string | null;
  taskId?: string | null;
  ticketId?: number | null;
  /** Para regras com destino "responsavel": quem e o responsavel deste caso. */
  emailResponsavel?: string | null;
  /** Para regras com destino "mencionados": quem foi citado no texto. */
  emailsMencionados?: string[];
  contexto: Contexto;
}

export async function enfileirarEvento(tx: Tx, alvo: Alvo): Promise<number> {
  const regras = await regrasDoEvento(tx, alvo.evento, alvo.boardId);
  const linhas = [];

  for (const regra of regras) {
    let destinatarios: string[];

    switch (regra.destinoTipo) {
      case "papel":
        destinatarios = regra.destinoPapel ? await emailsDoPapel(tx, regra.destinoPapel) : [];
        break;
      case "usuarios":
        destinatarios = await emailsDosIds(tx, regra.destinoUsers ?? []);
        break;
      case "responsavel":
        destinatarios = alvo.emailResponsavel ? [alvo.emailResponsavel] : [];
        break;
      case "mencionados":
        // Resolvidos por quem chamou, a partir do texto - a regra so diz que o
        // destinatario sai do conteudo, nao quem ele e.
        destinatarios = alvo.emailsMencionados ?? [];
        break;
    }

    // Sem ninguem com e-mail, a linha nao entra: fila vazia nao e falha a tratar.
    const unicos = [...new Set(destinatarios)];
    if (unicos.length === 0) continue;

    linhas.push({
      ruleId: regra.id,
      evento: alvo.evento,
      taskId: alvo.taskId ?? null,
      ticketId: alvo.ticketId ?? null,
      destinatarios: unicos,
      assunto: preencher(regra.assuntoTpl, alvo.contexto).slice(0, 200),
      corpo: preencher(regra.corpoTpl, alvo.contexto),
    });
  }

  await enfileirar(tx, linhas);
  return linhas.length;
}
