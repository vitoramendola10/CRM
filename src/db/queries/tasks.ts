import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db, type Tx } from "../client";
import {
  boardColumns,
  clients,
  taskComments,
  taskHistory,
  taskStatuses,
  taskTypes,
  tasks,
  users,
} from "../schema";
import type { Task, TaskCard, TaskComment, TaskHistory } from "@/domain";
import { bloqueiosDoBoard } from "./dependencias";
import { etiquetasDeVariasTasks } from "./etiquetas";

/**
 * Leitura e escrita das rotinas de dev.
 * O Kanban consome TaskCard (achatado, 1 query); a tela de detalhe consome Task.
 */

/**
 * Uma query so para o board inteiro - o TaskCard existe justamente para o
 * componente nao sair buscando cliente e responsavel card a card.
 */
export async function listarCards(boardId: string, assigneeId?: string): Promise<TaskCard[]> {
  const linhas = await db
    .select({
      id: tasks.id,
      codigo: tasks.codigo,
      solicitacao: tasks.ticketId,
      assunto: tasks.titulo,
      cliente: clients.razaoSocial,
      clienteId: tasks.clientId,
      responsavelId: users.id,
      responsavelNome: users.nome,
      statusNome: taskStatuses.nome,
      statusCor: taskStatuses.cor,
      statusCategoria: taskStatuses.categoria,
      inicio: tasks.iniciadoEm,
      prazo: tasks.prazo,
      prioridade: tasks.prioridade,
      columnId: tasks.columnId,
      rank: tasks.rank,
      estimativaH: tasks.estimativaH,
    })
    .from(tasks)
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .leftJoin(clients, eq(clients.id, tasks.clientId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(
      assigneeId
        ? and(eq(tasks.boardId, boardId), eq(tasks.assigneeId, assigneeId))
        : eq(tasks.boardId, boardId),
    )
    .orderBy(asc(tasks.columnId), asc(tasks.rank));

  // Consultas separadas, nao joins: etiqueta e dependencia sao N:N e um join
  // multiplicaria as linhas dos cards, obrigando a desfazer o agrupamento
  // depois. Duas consultas de mapa saem mais baratas e muito mais legiveis.
  const [etiquetas, bloqueios] = await Promise.all([
    etiquetasDeVariasTasks(linhas.map((l) => l.id)),
    bloqueiosDoBoard(boardId),
  ]);

  return linhas.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    solicitacao: l.solicitacao,
    assunto: l.assunto,
    cliente: l.cliente,
    clienteId: l.clienteId,
    responsavel: l.responsavelId ? { id: l.responsavelId, nome: l.responsavelNome! } : null,
    status: { nome: l.statusNome, cor: l.statusCor, categoria: l.statusCategoria },
    inicio: l.inicio,
    prazo: l.prazo,
    prioridade: l.prioridade,
    etiquetas: etiquetas[l.id] ?? [],
    columnId: l.columnId,
    rank: l.rank,
    estimativaH: l.estimativaH,
    bloqueios: bloqueios[l.id] ?? 0,
  }));
}

/** So o responsavel muda. E o "pegar para mim" do board. */
export async function atribuirResponsavel(
  tx: Tx,
  id: string,
  assigneeId: string | null,
): Promise<void> {
  await tx.update(tasks).set({ assigneeId }).where(eq(tasks.id, id));
}

/**
 * Quantas rotinas do board estao sem dono e ainda nao terminaram.
 *
 * Rotina escalada nasce sem responsavel, entao este numero e, na pratica, "o
 * que chegou e ninguem pegou". Serve de aviso dentro do sistema enquanto nao ha
 * SMTP - e continua util depois, porque e-mail se perde e board nao.
 */
export async function contarSemResponsavel(boardId: string): Promise<number> {
  const [r] = await db
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
  return r?.n ?? 0;
}

export async function buscarTask(id: string): Promise<Task | null> {
  const [t] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return t ?? null;
}

export async function buscarTaskPorCodigo(codigo: number): Promise<Task | null> {
  const [t] = await db.select().from(tasks).where(eq(tasks.codigo, codigo)).limit(1);
  return t ?? null;
}

/** Rank do card imediatamente antes e depois do ponto de soltura. */
export async function ranksDeVizinhos(
  tx: Tx,
  ids: { antesDeId: string | null; depoisDeId: string | null },
): Promise<{ antes: string | null; depois: string | null }> {
  async function rankDe(id: string | null): Promise<string | null> {
    if (!id) return null;
    const [r] = await tx.select({ rank: tasks.rank }).from(tasks).where(eq(tasks.id, id)).limit(1);
    return r?.rank ?? null;
  }
  return { antes: await rankDe(ids.antesDeId), depois: await rankDe(ids.depoisDeId) };
}

/** Trava a linha ate o fim da transacao - impede dois arrastos simultaneos. */
export async function travarTask(tx: Tx, id: string): Promise<Task | null> {
  const [t] = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1).for("update");
  return t ?? null;
}

export async function moverTaskNaColuna(
  tx: Tx,
  id: string,
  dados: { columnId: string; rank: string; iniciadoEm?: string; statusId?: string },
): Promise<void> {
  await tx.update(tasks).set(dados).where(eq(tasks.id, id));
}

/** Ordem atual de uma coluna. Base da reindexacao quando o rank esgota. */
export async function ranksDaColuna(
  tx: Tx,
  columnId: string,
): Promise<{ id: string; rank: string }[]> {
  return tx
    .select({ id: tasks.id, rank: tasks.rank })
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .orderBy(asc(tasks.rank));
}

export async function gravarRank(tx: Tx, id: string, rank: string): Promise<void> {
  await tx.update(tasks).set({ rank }).where(eq(tasks.id, id));
}

export async function ultimoRankDaColuna(tx: Tx, columnId: string): Promise<string | null> {
  const [r] = await tx
    .select({ rank: tasks.rank })
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .orderBy(desc(tasks.rank))
    .limit(1);
  return r?.rank ?? null;
}

export async function inserirTask(
  tx: Tx,
  dados: typeof tasks.$inferInsert,
): Promise<void> {
  await tx.insert(tasks).values(dados);
}

/** O codigo e auto_increment: so da para ler depois do insert. */
export async function codigoDaTask(tx: Tx, id: string): Promise<number> {
  const [t] = await tx.select({ codigo: tasks.codigo }).from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!t) throw new Error(`Task ${id} sumiu logo apos ser criada.`);
  return t.codigo;
}

// ------------------------------------------------------------------
// Historico
// ------------------------------------------------------------------

export async function registrarHistorico(
  tx: Tx,
  registros: {
    taskId: string;
    userId: string | null;
    campo: string;
    valorAntigo: string | null;
    valorNovo: string | null;
  }[],
): Promise<void> {
  if (registros.length === 0) return;
  await tx.insert(taskHistory).values(registros);
}

/** Historico ja traduzido: guardamos id, mas quem le quer ver nome. */
export async function listarHistorico(taskId: string): Promise<(TaskHistory & { autor: string | null })[]> {
  const linhas = await db
    .select({
      id: taskHistory.id,
      taskId: taskHistory.taskId,
      userId: taskHistory.userId,
      campo: taskHistory.campo,
      valorAntigo: taskHistory.valorAntigo,
      valorNovo: taskHistory.valorNovo,
      createdAt: taskHistory.createdAt,
      autor: users.nome,
    })
    .from(taskHistory)
    .leftJoin(users, eq(users.id, taskHistory.userId))
    .where(eq(taskHistory.taskId, taskId))
    .orderBy(desc(taskHistory.createdAt));
  return linhas;
}

// ------------------------------------------------------------------
// Comentarios
// ------------------------------------------------------------------

export async function listarComentarios(
  taskId: string,
): Promise<(TaskComment & { autor: string | null })[]> {
  return db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      userId: taskComments.userId,
      corpo: taskComments.corpo,
      createdAt: taskComments.createdAt,
      autor: users.nome,
    })
    .from(taskComments)
    .leftJoin(users, eq(users.id, taskComments.userId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));
}

export async function inserirComentario(
  id: string,
  taskId: string,
  userId: string,
  corpo: string,
  tx?: Tx,
): Promise<void> {
  await (tx ?? db).insert(taskComments).values({ id, taskId, userId, corpo });
}

/** Recebe `tx`: a edicao grava historico e pode enfileirar e-mail junto. */
export async function atualizarTaskCampos(
  tx: Tx,
  id: string,
  dados: Partial<typeof tasks.$inferInsert>,
): Promise<void> {
  await tx.update(tasks).set(dados).where(eq(tasks.id, id));
}

/** Nome legivel de cada id que aparece no historico e no detalhe. */
export async function dicionarioDeNomes(): Promise<Record<string, string>> {
  const [us, st, cols, tp] = await Promise.all([
    db.select({ id: users.id, nome: users.nome }).from(users),
    db.select({ id: taskStatuses.id, nome: taskStatuses.nome }).from(taskStatuses),
    db.select({ id: boardColumns.id, nome: boardColumns.nome }).from(boardColumns),
    db.select({ id: taskTypes.id, nome: taskTypes.nome }).from(taskTypes),
  ]);
  return Object.fromEntries([...us, ...st, ...cols, ...tp].map((r) => [r.id, r.nome]));
}

/** Quantas rotinas cada coluna tem agora - o aviso de WIP do Kanban. */
export async function contagemAtualPorColuna(boardId: string): Promise<Record<string, number>> {
  const linhas = await db
    .select({ columnId: tasks.columnId, n: sql<number>`count(*)`.mapWith(Number) })
    .from(tasks)
    .where(eq(tasks.boardId, boardId))
    .groupBy(tasks.columnId);
  return Object.fromEntries(linhas.map((l) => [l.columnId, l.n]));
}
