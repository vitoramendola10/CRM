import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { attachments, users } from "../schema";
import type { Anexo } from "@/domain";

/** O registro cru, com o caminho em disco. So o service usa. */
export interface AnexoNoBanco {
  id: string;
  ticketId: number | null;
  taskId: string | null;
  nomeOriginal: string;
  tipoMime: string;
  caminho: string;
  enviadoPor: string | null;
}

const colunas = {
  id: attachments.id,
  nomeOriginal: attachments.nomeOriginal,
  tipoMime: attachments.tipoMime,
  tamanhoBytes: attachments.tamanhoBytes,
  autor: users.nome,
  autorId: attachments.enviadoPor,
  createdAt: attachments.createdAt,
};

/** Mais antigo primeiro: a ordem em que o atendimento foi acontecendo. */
export async function listarAnexosDoTicket(ticketId: number): Promise<Anexo[]> {
  const linhas = await db
    .select(colunas)
    .from(attachments)
    .leftJoin(users, eq(users.id, attachments.enviadoPor))
    .where(eq(attachments.ticketId, ticketId))
    .orderBy(asc(attachments.createdAt));
  return linhas.map((l) => ({ ...l, herdado: false }));
}

/**
 * `herdado` marca o que veio do chamado de origem. A rotina exibe os dois
 * conjuntos juntos, mas so pode apagar o que e dela - o print que o suporte
 * anexou pertence ao atendimento, e apagar dali sumiria com ele do chamado.
 */
export async function listarAnexosDaTask(taskId: string, ticketId: number | null): Promise<Anexo[]> {
  const proprios = await db
    .select(colunas)
    .from(attachments)
    .leftJoin(users, eq(users.id, attachments.enviadoPor))
    .where(eq(attachments.taskId, taskId))
    .orderBy(asc(attachments.createdAt));

  const herdados = ticketId === null ? [] : await listarAnexosDoTicket(ticketId);

  return [
    ...herdados.map((a) => ({ ...a, herdado: true })),
    ...proprios.map((l) => ({ ...l, herdado: false })),
  ];
}

export async function buscarAnexo(id: string): Promise<AnexoNoBanco | null> {
  const [linha] = await db
    .select({
      id: attachments.id,
      ticketId: attachments.ticketId,
      taskId: attachments.taskId,
      nomeOriginal: attachments.nomeOriginal,
      tipoMime: attachments.tipoMime,
      caminho: attachments.caminho,
      enviadoPor: attachments.enviadoPor,
    })
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);
  return linha ?? null;
}

export async function inserirAnexo(dados: {
  id: string;
  ticketId: number | null;
  taskId: string | null;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  caminho: string;
  enviadoPor: string;
}): Promise<void> {
  await db.insert(attachments).values(dados);
}

export async function removerAnexo(id: string): Promise<void> {
  await db.delete(attachments).where(eq(attachments.id, id));
}

/**
 * Caminhos de todos os anexos de um chamado ou rotina. Existe para quem apaga o
 * dono: o ON DELETE CASCADE leva as linhas, mas nao encosta no disco.
 */
export async function caminhosDoTicket(ticketId: number): Promise<string[]> {
  const linhas = await db
    .select({ caminho: attachments.caminho })
    .from(attachments)
    .where(eq(attachments.ticketId, ticketId));
  return linhas.map((l) => l.caminho);
}

export async function caminhosDaTask(taskId: string): Promise<string[]> {
  const linhas = await db
    .select({ caminho: attachments.caminho })
    .from(attachments)
    .where(eq(attachments.taskId, taskId));
  return linhas.map((l) => l.caminho);
}
