import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { primeiraColuna, statusPorCategoria } from "@/db/queries/config";
import {
  codigoDaTask,
  inserirTask,
  registrarHistorico,
  ultimoRankDaColuna,
} from "@/db/queries/tasks";
import { travarTicket, vincularTask } from "@/db/queries/tickets";
import type { EscalarTicketInput, UsuarioSessao } from "@/domain";
import { RANK_INICIAL, rankEntre } from "@/lib/rank";
import { ErroDeNegocio } from "@/lib/rota";
import { enfileirarEvento } from "./notificacoes";

/**
 * "Enviar para desenvolvimento". Tudo em UMA transacao - inclusive a fila de
 * e-mail. Se o insert da task falhar depois de o ticket ja ter sido marcado, o
 * chamado nao pode ficar apontando para uma rotina que nao existe; e se o e-mail
 * fosse enviado aqui dentro, um rollback nao o traria de volta.
 */
export async function escalarTicket(
  dados: EscalarTicketInput,
  usuario: UsuarioSessao,
): Promise<{ taskId: string; codigo: number }> {
  return db.transaction(async (tx) => {
    // FOR UPDATE: dois atendentes clicando ao mesmo tempo geram uma rotina so.
    const ticket = await travarTicket(tx, dados.ticketId);
    if (!ticket) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
    if (ticket.taskId !== null) {
      throw new ErroDeNegocio("Este chamado ja esta com o desenvolvimento.");
    }

    const coluna = await primeiraColuna(dados.boardId);
    if (!coluna) {
      throw new ErroDeNegocio(
        "O board escolhido nao tem nenhuma etapa. Cadastre as etapas em Configuracao.",
      );
    }

    const aberto = await statusPorCategoria("aberto");
    if (!aberto) {
      throw new ErroDeNegocio(
        "Nao ha status ativo da categoria Aberto. Cadastre um em Configuracao > Status.",
      );
    }

    const ultimo = await ultimoRankDaColuna(tx, coluna.id);
    const taskId = randomUUID();

    await inserirTask(tx, {
      id: taskId,
      boardId: dados.boardId,
      columnId: coluna.id,
      statusId: aberto.id,
      typeId: dados.typeId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      passosRepro: dados.passosRepro,
      versaoSistema: dados.versaoSistema,
      prioridade: dados.prioridade,
      criadoPor: usuario.id,
      clientId: ticket.clientId,
      ticketId: ticket.id,
      rank: ultimo === null ? RANK_INICIAL : rankEntre(ultimo, null),
    });

    const codigo = await codigoDaTask(tx, taskId);

    // O chamado NAO fecha: ele fica aguardando o dev e volta ao suporte no fim.
    await vincularTask(tx, ticket.id, taskId, "aguardando_dev");

    await registrarHistorico(tx, [
      {
        taskId,
        userId: usuario.id,
        campo: "origem",
        valorAntigo: null,
        valorNovo: `Chamado #${ticket.id}`,
      },
    ]);

    await enfileirarEvento(tx, {
      evento: "task_criada",
      boardId: dados.boardId,
      taskId,
      ticketId: ticket.id,
      emailResponsavel: null,
      contexto: {
        codigo,
        titulo: dados.titulo,
        protocolo: ticket.id,
        prioridade: dados.prioridade,
        etapa: coluna.nome,
        solicitante: ticket.solicitante,
        autor: usuario.nome,
      },
    });

    return { taskId, codigo };
  });
}
