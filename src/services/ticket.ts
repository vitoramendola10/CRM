import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import {
  abrirTicket,
  atualizarTicket,
  buscarTicket,
  inserirMensagem,
} from "@/db/queries/tickets";
import type {
  AbrirTicketInput,
  AtualizarTicketInput,
  TicketMessageInput,
  UsuarioSessao,
} from "@/domain";
import { ErroDeNegocio } from "@/lib/rota";
import { enfileirarEvento } from "./notificacoes";

export async function novoTicket(
  dados: AbrirTicketInput,
  usuario: UsuarioSessao,
): Promise<number> {
  // Fora da transacao: o insert precisa acontecer antes para existir protocolo.
  const id = await abrirTicket(dados, usuario.id);

  await db.transaction(async (tx) => {
    await enfileirarEvento(tx, {
      evento: "ticket_aberto",
      // Chamado ainda nao tem board: so as regras globais valem aqui.
      boardId: null,
      ticketId: id,
      emailResponsavel: null,
      contexto: {
        protocolo: id,
        assunto: dados.assunto,
        solicitante: dados.solicitante,
        prioridade: dados.prioridade,
        atendente: usuario.nome,
      },
    });
  });

  return id;
}

export async function editarTicket(id: number, dados: AtualizarTicketInput): Promise<void> {
  if (!(await buscarTicket(id))) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
  await atualizarTicket(id, dados);
}

export async function registrarMensagem(
  ticketId: number,
  dados: TicketMessageInput,
  usuario: UsuarioSessao,
): Promise<string> {
  if (!(await buscarTicket(ticketId))) {
    throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
  }
  const id = randomUUID();
  await inserirMensagem(id, ticketId, usuario.id, dados.corpo, dados.interno);
  return id;
}
