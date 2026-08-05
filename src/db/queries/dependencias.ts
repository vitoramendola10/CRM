import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db, type Tx } from "../client";
import { boardColumns, taskLinks, taskStatuses, tasks } from "../schema";

/**
 * Dependencia entre rotinas. A aresta e uma so - `taskId` depende de
 * `dependeDeId` - e as duas telas ("depende de" e "bloqueia") sao a mesma
 * aresta lida de pontas diferentes.
 */

export interface RotinaVinculada {
  id: string;
  codigo: number;
  titulo: string;
  /** Ja entregue? E o que decide se a dependencia ainda trava alguma coisa. */
  concluida: boolean;
  etapa: string;
}

const vinculada = {
  id: tasks.id,
  codigo: tasks.codigo,
  titulo: tasks.titulo,
  concluida: boardColumns.isDone,
  etapa: boardColumns.nome,
};

/** O que esta rotina espera para poder andar. */
export async function dependenciasDe(taskId: string): Promise<RotinaVinculada[]> {
  return db
    .select(vinculada)
    .from(taskLinks)
    .innerJoin(tasks, eq(tasks.id, taskLinks.dependeDeId))
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .where(eq(taskLinks.taskId, taskId))
    .orderBy(asc(tasks.codigo));
}

/** Quem esta esperando esta rotina. */
export async function dependentesDe(taskId: string): Promise<RotinaVinculada[]> {
  return db
    .select(vinculada)
    .from(taskLinks)
    .innerJoin(tasks, eq(tasks.id, taskLinks.taskId))
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .where(eq(taskLinks.dependeDeId, taskId))
    .orderBy(asc(tasks.codigo));
}

/** As arestas cujas duas pontas estao neste board - o Gantt desenha a partir daqui. */
export async function arestasDoBoard(
  boardId: string,
): Promise<{ taskId: string; dependeDeId: string }[]> {
  const origem = alias(tasks, "origem");
  return db
    .select({ taskId: taskLinks.taskId, dependeDeId: taskLinks.dependeDeId })
    .from(taskLinks)
    .innerJoin(tasks, eq(tasks.id, taskLinks.taskId))
    .innerJoin(origem, eq(origem.id, taskLinks.dependeDeId))
    .where(and(eq(tasks.boardId, boardId), eq(origem.boardId, boardId)));
}

export async function vincular(tx: Tx, taskId: string, dependeDeId: string): Promise<void> {
  await tx.insert(taskLinks).values({ taskId, dependeDeId });
}

export async function desvincular(taskId: string, dependeDeId: string): Promise<void> {
  await db
    .delete(taskLinks)
    .where(and(eq(taskLinks.taskId, taskId), eq(taskLinks.dependeDeId, dependeDeId)));
}

/**
 * Todas as arestas do grafo, para a checagem de ciclo.
 *
 * Carrega a tabela inteira de proposito. Com um time de dez pessoas ela tem
 * dezenas de linhas, e uma consulta so em memoria e mais simples e mais barata
 * que uma recursiva no banco - alem de nao precisar de CTE recursiva, que muda
 * de sintaxe entre bancos e seria mais uma coisa a portar.
 */
export async function todasAsArestas(tx: Tx): Promise<{ taskId: string; dependeDeId: string }[]> {
  return tx.select({ taskId: taskLinks.taskId, dependeDeId: taskLinks.dependeDeId }).from(taskLinks);
}

/**
 * Quantas dependencias ainda nao entregues cada rotina do board tem.
 *
 * Uma consulta so para o board inteiro; contar card a card seria N+1 numa tela
 * que ja carrega tudo de uma vez. Rotina fora do mapa nao tem dependencia
 * pendente - quem le usa `?? 0`.
 */
export async function bloqueiosDoBoard(boardId: string): Promise<Record<string, number>> {
  const linhas = await db
    .select({ taskId: taskLinks.taskId, dependeDeId: taskLinks.dependeDeId })
    .from(taskLinks)
    .innerJoin(tasks, eq(tasks.id, taskLinks.taskId))
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .where(eq(tasks.boardId, boardId));

  if (linhas.length === 0) return {};

  // Quais das rotinas-alvo ja terminaram. Concluida pela COLUNA (a regra do
  // dominio) ou pelo STATUS cancelado - cancelada tambem para de bloquear.
  const alvos = await db
    .select({
      id: tasks.id,
      pronta: boardColumns.isDone,
      categoria: taskStatuses.categoria,
    })
    .from(tasks)
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId));

  const encerrada = new Map(
    alvos.map((a) => [a.id, a.pronta || a.categoria === "cancelado" || a.categoria === "concluido"]),
  );

  const contagem: Record<string, number> = {};
  for (const l of linhas) {
    if (encerrada.get(l.dependeDeId) === true) continue;
    contagem[l.taskId] = (contagem[l.taskId] ?? 0) + 1;
  }
  return contagem;
}
