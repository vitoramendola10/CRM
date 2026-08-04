import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, type Tx } from "../client";
import { notificationOutbox, notificationRules, users } from "../schema";
import type {
  EventoNotificacao,
  NotificationOutbox,
  NotificationRule,
  NotificationRuleInput,
  Papel,
} from "@/domain";

/**
 * Regras (o que notificar) e outbox (o que ja foi decidido notificar).
 * A escrita no outbox roda dentro da transacao do fato que a originou; e o
 * worker que envia depois, fora do request.
 */

const colunasRegra = {
  id: notificationRules.id,
  evento: notificationRules.evento,
  boardId: notificationRules.boardId,
  destinoTipo: notificationRules.destinoTipo,
  destinoPapel: notificationRules.destinoPapel,
  destinoUsers: notificationRules.destinoUsers,
  assuntoTpl: notificationRules.assuntoTpl,
  corpoTpl: notificationRules.corpoTpl,
  ativo: notificationRules.ativo,
};

export async function listarRegras(): Promise<NotificationRule[]> {
  return db.select(colunasRegra).from(notificationRules).orderBy(asc(notificationRules.evento));
}

/** Regras que valem para o evento: as do board especifico e as globais. */
export async function regrasDoEvento(
  tx: Tx,
  evento: EventoNotificacao,
  boardId: string | null,
): Promise<NotificationRule[]> {
  return tx
    .select(colunasRegra)
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.evento, evento),
        eq(notificationRules.ativo, true),
        boardId
          ? or(isNull(notificationRules.boardId), eq(notificationRules.boardId, boardId))
          : isNull(notificationRules.boardId),
      ),
    );
}

export async function criarRegra(id: string, dados: NotificationRuleInput): Promise<void> {
  await db.insert(notificationRules).values({ id, ...dados });
}

export async function atualizarRegra(id: string, dados: NotificationRuleInput): Promise<void> {
  await db.update(notificationRules).set(dados).where(eq(notificationRules.id, id));
}

export async function removerRegra(id: string): Promise<void> {
  await db.delete(notificationRules).where(eq(notificationRules.id, id));
}

// ------------------------------------------------------------------
// Destinatarios
// ------------------------------------------------------------------

/** Sempre filtrado por ativo e com e-mail: quem nao tem e-mail nao entra na fila. */
export async function emailsDoPapel(tx: Tx, papel: Papel): Promise<string[]> {
  const linhas = await tx
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.papel, papel), eq(users.ativo, true)));
  return linhas.map((l) => l.email).filter((e): e is string => !!e);
}

export async function emailsDosIds(tx: Tx, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const linhas = await tx
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.ativo, true)));
  return linhas.map((l) => l.email).filter((e): e is string => !!e);
}

// ------------------------------------------------------------------
// Outbox
// ------------------------------------------------------------------

export async function enfileirar(
  tx: Tx,
  linhas: (typeof notificationOutbox.$inferInsert)[],
): Promise<void> {
  if (linhas.length === 0) return;
  await tx.insert(notificationOutbox).values(linhas);
}

const colunasOutbox = {
  id: notificationOutbox.id,
  ruleId: notificationOutbox.ruleId,
  evento: notificationOutbox.evento,
  taskId: notificationOutbox.taskId,
  ticketId: notificationOutbox.ticketId,
  destinatarios: notificationOutbox.destinatarios,
  assunto: notificationOutbox.assunto,
  corpo: notificationOutbox.corpo,
  situacao: notificationOutbox.situacao,
  tentativas: notificationOutbox.tentativas,
  ultimoErro: notificationOutbox.ultimoErro,
  proximaTentativa: notificationOutbox.proximaTentativa,
  enviadoEm: notificationOutbox.enviadoEm,
};

/**
 * Lote do worker. SKIP LOCKED e o que permite mais de um worker rodando sem
 * que os dois peguem a mesma mensagem - e sem um esperar o lock do outro.
 */
export async function reservarLote(
  tx: Tx,
  agora: string,
  limite: number,
): Promise<NotificationOutbox[]> {
  return tx
    .select(colunasOutbox)
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.situacao, "pendente"),
        lte(notificationOutbox.proximaTentativa, agora),
      ),
    )
    .orderBy(asc(notificationOutbox.proximaTentativa))
    .limit(limite)
    .for("update", { skipLocked: true });
}

export async function marcarEnviado(tx: Tx, id: number, quando: string): Promise<void> {
  await tx
    .update(notificationOutbox)
    .set({ situacao: "enviado", enviadoEm: quando, ultimoErro: null })
    .where(eq(notificationOutbox.id, id));
}

export async function marcarFalha(
  tx: Tx,
  id: number,
  dados: { situacao: "pendente" | "erro"; proximaTentativa: string; erro: string },
): Promise<void> {
  await tx
    .update(notificationOutbox)
    .set({
      situacao: dados.situacao,
      proximaTentativa: dados.proximaTentativa,
      ultimoErro: dados.erro.slice(0, 500),
      tentativas: sql`${notificationOutbox.tentativas} + 1`,
    })
    .where(eq(notificationOutbox.id, id));
}

export async function listarOutbox(situacao?: "pendente" | "erro"): Promise<NotificationOutbox[]> {
  return db
    .select(colunasOutbox)
    .from(notificationOutbox)
    .where(situacao ? eq(notificationOutbox.situacao, situacao) : undefined)
    .orderBy(desc(notificationOutbox.id))
    .limit(200);
}

/** Reenvio manual da tela de falhas: zera o contador e devolve para a fila. */
export async function reenfileirar(id: number, agora: string): Promise<void> {
  await db
    .update(notificationOutbox)
    .set({ situacao: "pendente", tentativas: 0, proximaTentativa: agora, ultimoErro: null })
    .where(eq(notificationOutbox.id, id));
}

export async function contarPorSituacao(): Promise<Record<string, number>> {
  const linhas = await db
    .select({ situacao: notificationOutbox.situacao, n: sql<number>`count(*)`.mapWith(Number) })
    .from(notificationOutbox)
    .groupBy(notificationOutbox.situacao);
  return Object.fromEntries(linhas.map((l) => [l.situacao, l.n]));
}
