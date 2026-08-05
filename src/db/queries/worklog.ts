import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../client";
import { clients, taskWorklog, tasks, users } from "../schema";

export interface Apontamento {
  id: string;
  minutos: number;
  data: string;
  nota: string | null;
  autor: string | null;
  autorId: string | null;
}

export async function apontamentosDaTask(taskId: string): Promise<Apontamento[]> {
  return db
    .select({
      id: taskWorklog.id,
      minutos: taskWorklog.minutos,
      data: taskWorklog.data,
      nota: taskWorklog.nota,
      autor: users.nome,
      autorId: taskWorklog.userId,
    })
    .from(taskWorklog)
    .leftJoin(users, eq(users.id, taskWorklog.userId))
    .where(eq(taskWorklog.taskId, taskId))
    .orderBy(desc(taskWorklog.data), desc(taskWorklog.createdAt));
}

export async function inserirApontamento(dados: {
  id: string;
  taskId: string;
  userId: string;
  minutos: number;
  data: string;
  nota: string | null;
}): Promise<void> {
  await db.insert(taskWorklog).values(dados);
}

export async function buscarApontamento(
  id: string,
): Promise<{ id: string; taskId: string; userId: string | null } | null> {
  const [r] = await db
    .select({ id: taskWorklog.id, taskId: taskWorklog.taskId, userId: taskWorklog.userId })
    .from(taskWorklog)
    .where(eq(taskWorklog.id, id))
    .limit(1);
  return r ?? null;
}

export async function removerApontamento(id: string): Promise<void> {
  await db.delete(taskWorklog).where(eq(taskWorklog.id, id));
}

/** Total apontado numa rotina. O painel mostra junto da estimativa. */
export async function totalDaTask(taskId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${taskWorklog.minutos}), 0)`.mapWith(Number) })
    .from(taskWorklog)
    .where(eq(taskWorklog.taskId, taskId));
  return r?.n ?? 0;
}

export interface HorasDoCliente {
  cliente: string;
  minutos: number;
  rotinas: number;
}

/**
 * Horas por cliente no periodo.
 *
 * O `clientId` ja estava na rotina desde o inicio, entao este relatorio sai de
 * graca - era so ter onde apontar. Rotina sem cliente entra como "Interno":
 * some-la esconderia trabalho que existiu e faria a soma nao bater com o total.
 */
export async function horasPorCliente(desdeIso: string): Promise<HorasDoCliente[]> {
  const linhas = await db
    .select({
      cliente: sql<string>`coalesce(${clients.razaoSocial}, 'Interno')`,
      minutos: sql<number>`sum(${taskWorklog.minutos})`.mapWith(Number),
      rotinas: sql<number>`count(distinct ${taskWorklog.taskId})`.mapWith(Number),
    })
    .from(taskWorklog)
    .innerJoin(tasks, eq(tasks.id, taskWorklog.taskId))
    .leftJoin(clients, eq(clients.id, tasks.clientId))
    .where(gte(taskWorklog.data, desdeIso))
    .groupBy(sql`coalesce(${clients.razaoSocial}, 'Interno')`)
    .orderBy(desc(sql`sum(${taskWorklog.minutos})`));
  return linhas;
}

/** Total do periodo, para a porcentagem de cada cliente fechar em 100. */
export async function totalNoPeriodo(desdeIso: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${taskWorklog.minutos}), 0)`.mapWith(Number) })
    .from(taskWorklog)
    .where(and(gte(taskWorklog.data, desdeIso)));
  return r?.n ?? 0;
}
