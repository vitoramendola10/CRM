import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "../client";
import { labels, taskLabels } from "../schema";
import type { Etiqueta, EtiquetaInput } from "@/domain";

const colunas = {
  id: labels.id,
  nome: labels.nome,
  cor: labels.cor,
  ativo: labels.ativo,
};

export async function listarEtiquetas(apenasAtivas = false): Promise<Etiqueta[]> {
  return db
    .select(colunas)
    .from(labels)
    .where(apenasAtivas ? eq(labels.ativo, true) : undefined)
    .orderBy(asc(labels.nome));
}

export async function criarEtiqueta(id: string, dados: EtiquetaInput): Promise<void> {
  await db.insert(labels).values({ id, ...dados });
}

export async function atualizarEtiqueta(id: string, dados: EtiquetaInput): Promise<void> {
  await db.update(labels).set(dados).where(eq(labels.id, id));
}

export async function removerEtiqueta(id: string): Promise<void> {
  // task_labels cai por cascata: tirar a etiqueta do sistema a tira das rotinas.
  await db.delete(labels).where(eq(labels.id, id));
}

export async function contagemPorEtiqueta(): Promise<Record<string, number>> {
  const linhas = await db
    .select({ labelId: taskLabels.labelId, n: sql<number>`count(*)`.mapWith(Number) })
    .from(taskLabels)
    .groupBy(taskLabels.labelId);
  return Object.fromEntries(linhas.map((l) => [l.labelId, l.n]));
}

// ------------------------------------------------------------------
// Vinculo com as rotinas
// ------------------------------------------------------------------

export async function etiquetasDaTask(taskId: string): Promise<Etiqueta[]> {
  return db
    .select(colunas)
    .from(taskLabels)
    .innerJoin(labels, eq(labels.id, taskLabels.labelId))
    .where(eq(taskLabels.taskId, taskId))
    .orderBy(asc(labels.nome));
}

/** Etiquetas de varias rotinas de uma vez - o board precisa disso sem N+1. */
export async function etiquetasDeVariasTasks(
  taskIds: string[],
): Promise<Record<string, Etiqueta[]>> {
  if (taskIds.length === 0) return {};
  const linhas = await db
    .select({ taskId: taskLabels.taskId, ...colunas })
    .from(taskLabels)
    .innerJoin(labels, eq(labels.id, taskLabels.labelId))
    .where(inArray(taskLabels.taskId, taskIds))
    .orderBy(asc(labels.nome));

  const mapa: Record<string, Etiqueta[]> = {};
  for (const l of linhas) {
    (mapa[l.taskId] ??= []).push({ id: l.id, nome: l.nome, cor: l.cor, ativo: l.ativo });
  }
  return mapa;
}

/**
 * A lista enviada vira a lista final: apaga tudo e regrava. Com no maximo 20
 * etiquetas por rotina, isso e mais simples e mais barato que calcular o delta.
 */
export async function definirEtiquetasDaTask(
  tx: Tx,
  taskId: string,
  etiquetaIds: string[],
): Promise<void> {
  await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
  if (etiquetaIds.length === 0) return;
  await tx.insert(taskLabels).values(etiquetaIds.map((labelId) => ({ taskId, labelId })));
}
