import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { cannedReplies } from "../schema";
import type { Resposta, RespostaInput } from "@/domain";

const colunas = {
  id: cannedReplies.id,
  nome: cannedReplies.nome,
  corpo: cannedReplies.corpo,
  situacao: cannedReplies.situacao,
  interno: cannedReplies.interno,
  ordem: cannedReplies.ordem,
  ativo: cannedReplies.ativo,
};

/**
 * Ordem manual primeiro, nome depois. Quem cadastra sabe quais sao as tres que
 * usa o dia inteiro; alfabetica pura enterraria elas no meio da lista.
 */
export async function listarRespostas(apenasAtivas = false): Promise<Resposta[]> {
  return db
    .select(colunas)
    .from(cannedReplies)
    .where(apenasAtivas ? eq(cannedReplies.ativo, true) : undefined)
    .orderBy(asc(cannedReplies.ordem), asc(cannedReplies.nome));
}

export async function criarResposta(id: string, dados: RespostaInput): Promise<void> {
  await db.insert(cannedReplies).values({ id, ...dados });
}

export async function atualizarResposta(id: string, dados: RespostaInput): Promise<void> {
  await db.update(cannedReplies).set(dados).where(eq(cannedReplies.id, id));
}

export async function removerResposta(id: string): Promise<void> {
  await db.delete(cannedReplies).where(eq(cannedReplies.id, id));
}
