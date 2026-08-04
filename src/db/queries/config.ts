import { and, asc, count, eq, inArray, max, ne, sql } from "drizzle-orm";
import { db } from "../client";
import { boardColumns, boards, taskStatuses, taskTypes, tasks } from "../schema";
import type {
  Board,
  BoardColumn,
  BoardColumnInput,
  CategoriaStatus,
  TaskStatus,
  TaskStatusInput,
  TaskType,
  TaskTypeInput,
} from "@/domain";

/**
 * Configuracao do Kanban. Sempre devolve os tipos de src/domain,
 * nunca a linha crua do Drizzle.
 */

// ------------------------------------------------------------------
// Leitura
// ------------------------------------------------------------------

export async function listarBoards(): Promise<Board[]> {
  return db
    .select({
      id: boards.id,
      nome: boards.nome,
      tipo: boards.tipo,
      descricao: boards.descricao,
      ativo: boards.ativo,
    })
    .from(boards)
    .orderBy(asc(boards.nome));
}

export async function boardPadrao(): Promise<Board | null> {
  const [b] = await db
    .select({
      id: boards.id,
      nome: boards.nome,
      tipo: boards.tipo,
      descricao: boards.descricao,
      ativo: boards.ativo,
    })
    .from(boards)
    .where(and(eq(boards.tipo, "dev"), eq(boards.ativo, true)))
    .orderBy(asc(boards.nome))
    .limit(1);
  return b ?? null;
}

export async function listarColunas(boardId: string): Promise<BoardColumn[]> {
  return db
    .select({
      id: boardColumns.id,
      boardId: boardColumns.boardId,
      nome: boardColumns.nome,
      ordem: boardColumns.ordem,
      cor: boardColumns.cor,
      wipLimit: boardColumns.wipLimit,
      isDone: boardColumns.isDone,
    })
    .from(boardColumns)
    .where(eq(boardColumns.boardId, boardId))
    .orderBy(asc(boardColumns.ordem));
}

export async function buscarColuna(id: string): Promise<BoardColumn | null> {
  const [c] = await db
    .select({
      id: boardColumns.id,
      boardId: boardColumns.boardId,
      nome: boardColumns.nome,
      ordem: boardColumns.ordem,
      cor: boardColumns.cor,
      wipLimit: boardColumns.wipLimit,
      isDone: boardColumns.isDone,
    })
    .from(boardColumns)
    .where(eq(boardColumns.id, id))
    .limit(1);
  return c ?? null;
}

/** A coluna onde toda rotina nasce: a de menor `ordem` do board. */
export async function primeiraColuna(boardId: string): Promise<BoardColumn | null> {
  const [c] = await db
    .select({
      id: boardColumns.id,
      boardId: boardColumns.boardId,
      nome: boardColumns.nome,
      ordem: boardColumns.ordem,
      cor: boardColumns.cor,
      wipLimit: boardColumns.wipLimit,
      isDone: boardColumns.isDone,
    })
    .from(boardColumns)
    .where(eq(boardColumns.boardId, boardId))
    .orderBy(asc(boardColumns.ordem))
    .limit(1);
  return c ?? null;
}

export async function listarStatus(apenasAtivos = false): Promise<TaskStatus[]> {
  return db
    .select({
      id: taskStatuses.id,
      nome: taskStatuses.nome,
      categoria: taskStatuses.categoria,
      cor: taskStatuses.cor,
      ordem: taskStatuses.ordem,
      ativo: taskStatuses.ativo,
    })
    .from(taskStatuses)
    .where(apenasAtivos ? eq(taskStatuses.ativo, true) : undefined)
    .orderBy(asc(taskStatuses.ordem));
}

/**
 * Primeiro status de uma categoria, na ordem que o usuario definiu.
 * E assim que escalar/mover escolhem status sem chumbar nome nenhum no codigo.
 */
export async function statusPorCategoria(categoria: CategoriaStatus): Promise<TaskStatus | null> {
  const [s] = await db
    .select({
      id: taskStatuses.id,
      nome: taskStatuses.nome,
      categoria: taskStatuses.categoria,
      cor: taskStatuses.cor,
      ordem: taskStatuses.ordem,
      ativo: taskStatuses.ativo,
    })
    .from(taskStatuses)
    .where(and(eq(taskStatuses.categoria, categoria), eq(taskStatuses.ativo, true)))
    .orderBy(asc(taskStatuses.ordem))
    .limit(1);
  return s ?? null;
}

export async function listarTipos(apenasAtivos = false): Promise<TaskType[]> {
  return db
    .select({
      id: taskTypes.id,
      nome: taskTypes.nome,
      cor: taskTypes.cor,
      ativo: taskTypes.ativo,
    })
    .from(taskTypes)
    .where(apenasAtivos ? eq(taskTypes.ativo, true) : undefined)
    .orderBy(asc(taskTypes.nome));
}

// ------------------------------------------------------------------
// Colunas
// ------------------------------------------------------------------

export async function criarColuna(id: string, dados: BoardColumnInput): Promise<void> {
  // Entra sempre no fim; reordenar e uma acao separada e explicita.
  const [r] = await db
    .select({ maior: max(boardColumns.ordem) })
    .from(boardColumns)
    .where(eq(boardColumns.boardId, dados.boardId));

  await db.insert(boardColumns).values({
    id,
    boardId: dados.boardId,
    nome: dados.nome,
    cor: dados.cor,
    wipLimit: dados.wipLimit,
    isDone: dados.isDone,
    ordem: (r?.maior ?? 0) + 1,
  });
}

export async function atualizarColuna(
  id: string,
  dados: Omit<BoardColumnInput, "boardId">,
): Promise<void> {
  await db
    .update(boardColumns)
    .set({
      nome: dados.nome,
      cor: dados.cor,
      wipLimit: dados.wipLimit,
      isDone: dados.isDone,
    })
    .where(eq(boardColumns.id, id));
}

export async function contarTasksNaColuna(columnId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(tasks).where(eq(tasks.columnId, columnId));
  return r?.n ?? 0;
}

export async function contarColunas(boardId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(boardColumns)
    .where(eq(boardColumns.boardId, boardId));
  return r?.n ?? 0;
}

export async function removerColuna(id: string): Promise<void> {
  await db.delete(boardColumns).where(eq(boardColumns.id, id));
}

/**
 * (board_id, ordem) e UNIQUE e o MySQL nao tem constraint DEFERRABLE: gravar a
 * ordem final direto colide com a linha que ainda ocupa aquele numero. Dai as
 * duas fases - joga todo mundo para ordem negativa, depois grava a definitiva.
 */
export async function reordenarColunas(boardId: string, ids: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(boardColumns)
      .set({ ordem: sql`-${boardColumns.ordem}` })
      .where(eq(boardColumns.boardId, boardId));

    for (const [i, id] of ids.entries()) {
      await tx
        .update(boardColumns)
        .set({ ordem: i + 1 })
        .where(and(eq(boardColumns.id, id), eq(boardColumns.boardId, boardId)));
    }
  });
}

export async function idsDeColunas(boardId: string): Promise<string[]> {
  const linhas = await db
    .select({ id: boardColumns.id })
    .from(boardColumns)
    .where(eq(boardColumns.boardId, boardId));
  return linhas.map((l) => l.id);
}

// ------------------------------------------------------------------
// Status
// ------------------------------------------------------------------

export async function criarStatus(id: string, dados: TaskStatusInput): Promise<void> {
  await db.insert(taskStatuses).values({ id, ...dados });
}

/** Sem `categoria` de proposito: renomear um status nunca pode mudar o relatorio. */
export async function atualizarStatus(
  id: string,
  dados: Omit<TaskStatusInput, "categoria">,
): Promise<void> {
  await db.update(taskStatuses).set(dados).where(eq(taskStatuses.id, id));
}

export async function buscarStatus(id: string): Promise<TaskStatus | null> {
  const [s] = await db
    .select({
      id: taskStatuses.id,
      nome: taskStatuses.nome,
      categoria: taskStatuses.categoria,
      cor: taskStatuses.cor,
      ordem: taskStatuses.ordem,
      ativo: taskStatuses.ativo,
    })
    .from(taskStatuses)
    .where(eq(taskStatuses.id, id))
    .limit(1);
  return s ?? null;
}

export async function contarTasksComStatus(statusId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(tasks).where(eq(tasks.statusId, statusId));
  return r?.n ?? 0;
}

/** Quantos outros status ativos cobrem a mesma categoria. Zero = nao pode desativar. */
export async function contarStatusDaCategoria(
  categoria: CategoriaStatus,
  exceto: string,
): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(taskStatuses)
    .where(
      and(
        eq(taskStatuses.categoria, categoria),
        eq(taskStatuses.ativo, true),
        ne(taskStatuses.id, exceto),
      ),
    );
  return r?.n ?? 0;
}

export async function removerStatus(id: string): Promise<void> {
  await db.delete(taskStatuses).where(eq(taskStatuses.id, id));
}

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export async function criarTipo(id: string, dados: TaskTypeInput): Promise<void> {
  await db.insert(taskTypes).values({ id, ...dados });
}

export async function atualizarTipo(id: string, dados: TaskTypeInput): Promise<void> {
  await db.update(taskTypes).set(dados).where(eq(taskTypes.id, id));
}

export async function contarTasksComTipo(typeId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(tasks).where(eq(tasks.typeId, typeId));
  return r?.n ?? 0;
}

export async function removerTipo(id: string): Promise<void> {
  await db.delete(taskTypes).where(eq(taskTypes.id, id));
}

// ------------------------------------------------------------------
// Contagens de uso (a tela mostra antes de deixar excluir)
// ------------------------------------------------------------------

export async function contagemPorColuna(boardId: string): Promise<Record<string, number>> {
  const linhas = await db
    .select({ columnId: tasks.columnId, n: count() })
    .from(tasks)
    .where(eq(tasks.boardId, boardId))
    .groupBy(tasks.columnId);
  return Object.fromEntries(linhas.map((l) => [l.columnId, l.n]));
}

export async function contagemPorStatus(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const linhas = await db
    .select({ statusId: tasks.statusId, n: count() })
    .from(tasks)
    .where(inArray(tasks.statusId, ids))
    .groupBy(tasks.statusId);
  return Object.fromEntries(linhas.map((l) => [l.statusId, l.n]));
}

export async function contagemPorTipo(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const linhas = await db
    .select({ typeId: tasks.typeId, n: count() })
    .from(tasks)
    .where(inArray(tasks.typeId, ids))
    .groupBy(tasks.typeId);
  return Object.fromEntries(
    linhas.filter((l): l is { typeId: string; n: number } => l.typeId !== null).map((l) => [l.typeId, l.n]),
  );
}
