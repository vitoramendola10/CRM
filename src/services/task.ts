import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { emailsDosIds } from "@/db/queries/notifications";
import {
  atualizarTaskCampos,
  buscarTask,
  inserirComentario,
  registrarHistorico,
} from "@/db/queries/tasks";
import type { AtualizarTaskInput, Task, UsuarioSessao } from "@/domain";
import { ErroDeNegocio } from "@/lib/rota";
import { enfileirarEvento } from "./notificacoes";

/**
 * Campos cuja mudanca vale uma linha de historico - sao os que respondem
 * "por que esta rotina demorou". Titulo e descricao mudam demais para render
 * timeline util; ficam de fora de proposito.
 */
const RASTREADOS = [
  ["statusId", "status_id"],
  ["assigneeId", "assignee_id"],
  ["typeId", "type_id"],
  ["prioridade", "prioridade"],
  ["prazo", "prazo"],
  ["clientId", "client_id"],
] as const;

export async function editarTask(
  id: string,
  dados: AtualizarTaskInput,
  usuario: UsuarioSessao,
): Promise<void> {
  const atual = await buscarTask(id);
  if (!atual) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

  const mudancas = RASTREADOS.filter(([campo]) => valorDe(atual, campo) !== valorDe(dados, campo));
  const novoResponsavel =
    dados.assigneeId !== null && dados.assigneeId !== atual.assigneeId ? dados.assigneeId : null;

  await db.transaction(async (tx) => {
    await atualizarTaskCampos(tx, id, dados);

    await registrarHistorico(
      tx,
      mudancas.map(([campo, coluna]) => ({
        taskId: id,
        userId: usuario.id,
        campo: coluna,
        valorAntigo: texto(valorDe(atual, campo)),
        valorNovo: texto(valorDe(dados, campo)),
      })),
    );

    if (novoResponsavel) {
      const [email] = await emailsDosIds(tx, [novoResponsavel]);
      await enfileirarEvento(tx, {
        evento: "task_atribuida",
        boardId: atual.boardId,
        taskId: id,
        ticketId: atual.ticketId,
        emailResponsavel: email ?? null,
        contexto: {
          codigo: atual.codigo,
          titulo: dados.titulo,
          protocolo: atual.ticketId,
          responsavel: usuario.nome,
        },
      });
    }
  });
}

export async function comentar(
  taskId: string,
  corpo: string,
  usuario: UsuarioSessao,
): Promise<string> {
  if (!(await buscarTask(taskId))) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);
  const id = randomUUID();
  await inserirComentario(id, taskId, usuario.id, corpo);
  return id;
}

function valorDe(o: Task | AtualizarTaskInput, campo: string): unknown {
  return (o as unknown as Record<string, unknown>)[campo];
}

function texto(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
