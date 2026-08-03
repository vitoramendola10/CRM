import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { boardColumns, boards, taskStatuses, taskTypes } from "../schema";
import type { Board, BoardColumn, TaskStatus, TaskType } from "@/domain";

/**
 * Leitura da configuracao do Kanban. Sempre devolve os tipos de src/domain,
 * nunca a linha crua do Drizzle.
 */

export async function listarBoards(): Promise<Board[]> {
  const linhas = await db
    .select({
      id: boards.id,
      nome: boards.nome,
      tipo: boards.tipo,
      descricao: boards.descricao,
      ativo: boards.ativo,
    })
    .from(boards)
    .orderBy(asc(boards.nome));
  return linhas;
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

export async function listarStatus(): Promise<TaskStatus[]> {
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
    .orderBy(asc(taskStatuses.ordem));
}

export async function listarTipos(): Promise<TaskType[]> {
  return db
    .select({
      id: taskTypes.id,
      nome: taskTypes.nome,
      cor: taskTypes.cor,
      ativo: taskTypes.ativo,
    })
    .from(taskTypes)
    .orderBy(asc(taskTypes.nome));
}
