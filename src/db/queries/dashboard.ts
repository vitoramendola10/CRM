import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "../client";
import {
  boardColumns,
  clients,
  taskHistory,
  taskStatuses,
  tasks,
  ticketHistory,
  tickets,
  users,
} from "../schema";
import type { Prioridade } from "@/domain";

/**
 * Leitura para relatorio. Tudo agrupa por CATEGORIA de status, nunca por nome:
 * renomear "Em desenvolvimento" para "Codificando" nao pode mexer no numero.
 */

export interface MovimentoDeColuna {
  taskId: string;
  columnId: string;
  entrouEm: string;
}

/**
 * Eventos de entrada em coluna, por tarefa. A duracao sai daqui em TypeScript e
 * nao em SQL: a primeira coluna nao gera linha de historico (a tarefa nasce
 * nela), entao a serie precisa ser costurada com a data de criacao da tarefa.
 */
export async function movimentosDeColuna(boardId: string): Promise<{
  criacao: { id: string; columnId: string; createdAt: string }[];
  historico: { taskId: string; valorAntigo: string | null; valorNovo: string | null; createdAt: string }[];
}> {
  const criacao = await db
    .select({ id: tasks.id, columnId: tasks.columnId, createdAt: tasks.createdAt })
    .from(tasks)
    .where(eq(tasks.boardId, boardId));

  const historico = await db
    .select({
      taskId: taskHistory.taskId,
      valorAntigo: taskHistory.valorAntigo,
      valorNovo: taskHistory.valorNovo,
      createdAt: taskHistory.createdAt,
    })
    .from(taskHistory)
    .innerJoin(tasks, eq(tasks.id, taskHistory.taskId))
    .where(and(eq(tasks.boardId, boardId), eq(taskHistory.campo, "column_id")))
    .orderBy(asc(taskHistory.taskId), asc(taskHistory.createdAt));

  return { criacao, historico };
}

export interface BacklogPorCliente {
  cliente: string;
  clientId: string | null;
  total: number;
  urgentes: number;
  maisAntigaEm: string;
}

/** Backlog = tudo que nao esta concluido nem cancelado. */
export async function backlogPorCliente(boardId: string): Promise<BacklogPorCliente[]> {
  const linhas = await db
    .select({
      clientId: tasks.clientId,
      cliente: clients.razaoSocial,
      total: sql<number>`count(*)`.mapWith(Number),
      urgentes: sql<number>`sum(case when ${tasks.prioridade} in ('alta','urgente') then 1 else 0 end)`.mapWith(
        Number,
      ),
      maisAntigaEm: sql<string>`min(${tasks.createdAt})`,
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .leftJoin(clients, eq(clients.id, tasks.clientId))
    .where(
      and(
        eq(tasks.boardId, boardId),
        ne(taskStatuses.categoria, "concluido"),
        ne(taskStatuses.categoria, "cancelado"),
      ),
    )
    .groupBy(tasks.clientId, clients.razaoSocial)
    .orderBy(sql`count(*) desc`);

  return linhas.map((l) => ({
    clientId: l.clientId,
    cliente: l.cliente ?? "Sem cliente",
    total: l.total,
    urgentes: l.urgentes,
    maisAntigaEm: l.maisAntigaEm,
  }));
}

export interface ChamadoAguardando {
  id: number;
  assunto: string;
  cliente: string | null;
  prioridade: Prioridade;
  abertoEm: string;
  codigoTask: number | null;
  responsavel: string | null;
}

/** O que o suporte entregou ao dev e ainda nao voltou. */
export async function chamadosAguardandoDev(): Promise<ChamadoAguardando[]> {
  return db
    .select({
      id: tickets.id,
      assunto: tickets.assunto,
      cliente: clients.razaoSocial,
      prioridade: tickets.prioridade,
      abertoEm: tickets.abertoEm,
      codigoTask: tasks.codigo,
      responsavel: users.nome,
    })
    .from(tickets)
    .leftJoin(clients, eq(clients.id, tickets.clientId))
    .leftJoin(tasks, eq(tasks.id, tickets.taskId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tickets.situacao, "aguardando_dev"))
    .orderBy(asc(tickets.abertoEm))
    .limit(100);
}

export interface Resumo {
  emAberto: number;
  emAndamento: number;
  concluidasNoMes: number;
  semResponsavel: number;
  cycleTimeMedioDias: number | null;
}

/**
 * Momento da entrega de cada tarefa: a ultima vez que ela entrou numa coluna
 * `is_done`. NAO da para usar `tasks.updated_at` para isso - ele muda a cada
 * edicao, entao renomear o titulo de uma rotina entregue mes passado a faria
 * parecer entregue hoje.
 */
const entregas = db
  .select({
    taskId: taskHistory.taskId,
    concluidaEm: sql<string>`max(${taskHistory.createdAt})`.as("concluida_em"),
  })
  .from(taskHistory)
  .innerJoin(boardColumns, sql`${boardColumns.id} = ${taskHistory.valorNovo}`)
  .where(and(eq(taskHistory.campo, "column_id"), eq(boardColumns.isDone, true)))
  .groupBy(taskHistory.taskId)
  .as("entregas");

export async function resumo(boardId: string): Promise<Resumo> {
  const porCategoria = await db
    .select({
      categoria: taskStatuses.categoria,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .where(eq(tasks.boardId, boardId))
    .groupBy(taskStatuses.categoria);

  const contagem = Object.fromEntries(porCategoria.map((l) => [l.categoria, l.n]));

  const [sem] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(tasks)
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .where(
      and(
        eq(tasks.boardId, boardId),
        isNull(tasks.assigneeId),
        ne(taskStatuses.categoria, "concluido"),
        ne(taskStatuses.categoria, "cancelado"),
      ),
    );

  const [entrega] = await db
    .select({
      noMes: sql<number>`sum(${entregas.concluidaEm} >= date_sub(current_timestamp(3), interval 30 day))`.mapWith(
        Number,
      ),
      // Cycle time: de quando entrou em andamento ate a entrega.
      cicloDias: sql<number | null>`avg(timestampdiff(minute, ${tasks.iniciadoEm}, ${entregas.concluidaEm})) / 1440`,
    })
    .from(tasks)
    .innerJoin(entregas, eq(entregas.taskId, tasks.id))
    .where(and(eq(tasks.boardId, boardId), isNotNull(tasks.iniciadoEm)));

  const ciclo = entrega?.cicloDias;

  return {
    emAberto: contagem.aberto ?? 0,
    emAndamento: contagem.andamento ?? 0,
    concluidasNoMes: entrega?.noMes ?? 0,
    semResponsavel: sem?.n ?? 0,
    cycleTimeMedioDias: ciclo === null || ciclo === undefined ? null : Number(ciclo),
  };
}

export interface ResumoSuporte {
  abertos: number;
  /** Aberto, sem ninguem: e o pior estado em que um chamado pode estar. */
  semAtendente: number;
  /** Aberto e sem nenhum movimento ha mais de DIAS_CHAMADO_PARADO. */
  parados: number;
  fechadosNoMes: number;
  /** Da abertura ao fechamento, em dias. null quando nada fechou ainda. */
  tempoMedioDias: number | null;
  /** Reaberturas nos ultimos 30 dias - a medida de qualidade mais honesta. */
  reaberturasNoMes: number;
}

/**
 * O suporte, medido.
 *
 * `fechado_em` ja era gravado e nao era lido por ninguem: o dashboard so olhava
 * o board de dev. Aqui ele finalmente vira numero. Tudo sai de uma varredura so
 * em `tickets`, mais uma contagem no historico - a tabela e pequena e o
 * dashboard e uma tela, nao um relatorio.
 */
export async function resumoSuporte(diasParado: number): Promise<ResumoSuporte> {
  const abertoAgora = sql`${tickets.situacao} not in ('resolvido','cancelado')`;

  const [linha] = await db
    .select({
      abertos: sql<number>`sum(${abertoAgora})`.mapWith(Number),
      semAtendente: sql<number>`sum(${abertoAgora} and ${tickets.atendenteId} is null)`.mapWith(
        Number,
      ),
      parados: sql<number>`sum(${abertoAgora} and ${ultimaAtividadeDoTicket} < date_sub(current_timestamp(3), interval ${sql.raw(String(diasParado))} day))`.mapWith(
        Number,
      ),
      fechadosNoMes: sql<number>`sum(${tickets.fechadoEm} >= date_sub(current_timestamp(3), interval 30 day))`.mapWith(
        Number,
      ),
      // Em minutos e dividido depois: timestampdiff em dias truncaria tudo que
      // fecha no mesmo dia para zero, e no suporte isso e a maioria.
      tempoMedioDias: sql<
        number | null
      >`avg(timestampdiff(minute, ${tickets.abertoEm}, ${tickets.fechadoEm})) / 1440`,
    })
    .from(tickets);

  const [reab] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(ticketHistory)
    .where(
      and(
        eq(ticketHistory.campo, "reaberto"),
        sql`${ticketHistory.createdAt} >= date_sub(current_timestamp(3), interval 30 day)`,
      ),
    );

  const media = linha?.tempoMedioDias;

  return {
    abertos: linha?.abertos ?? 0,
    semAtendente: linha?.semAtendente ?? 0,
    parados: linha?.parados ?? 0,
    fechadosNoMes: linha?.fechadosNoMes ?? 0,
    tempoMedioDias: media === null || media === undefined ? null : Number(media),
    reaberturasNoMes: reab?.n ?? 0,
  };
}

/** Mesma definicao da lista de atendimentos - ver queries/tickets.ts. */
const ultimaAtividadeDoTicket = sql`GREATEST(
  ${tickets.abertoEm},
  COALESCE((SELECT MAX(m.created_at) FROM ticket_messages m WHERE m.ticket_id = ${tickets.id}), ${tickets.abertoEm}),
  COALESCE((SELECT MAX(h.created_at) FROM ticket_history h WHERE h.ticket_id = ${tickets.id}), ${tickets.abertoEm})
)`;

export async function nomesDeColunas(ids: string[]): Promise<Record<string, { nome: string; cor: string }>> {
  if (ids.length === 0) return {};
  const linhas = await db
    .select({ id: boardColumns.id, nome: boardColumns.nome, cor: boardColumns.cor })
    .from(boardColumns)
    .where(inArray(boardColumns.id, ids));
  return Object.fromEntries(linhas.map((l) => [l.id, { nome: l.nome, cor: l.cor }]));
}
