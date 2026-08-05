import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import {
  abrirTicket,
  atualizarAtendente,
  atualizarSituacao,
  atualizarTicket,
  buscarTicket,
  inserirMensagem,
  registrarHistoricoTicket,
  taskDoTicketConcluida,
  type RegistroDeHistorico,
  type TicketDaLista,
} from "@/db/queries/tickets";
import { buscarUsuario } from "@/db/queries/users";
import {
  ROTULO_PRIORIDADE,
  ROTULO_SITUACAO_TICKET,
  situacaoEhFechada,
  type AbrirTicketInput,
  type AtualizarTicketInput,
  type SituacaoTicket,
  type TicketMessageInput,
  type UsuarioSessao,
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

/**
 * Edicao pelo formulario completo. Grava o que mudou no historico, na mesma
 * transacao do UPDATE: historico que pode faltar quando a escrita falha nao
 * serve para auditar coisa nenhuma.
 */
export async function editarTicket(
  id: number,
  dados: AtualizarTicketInput,
  usuario: UsuarioSessao,
): Promise<void> {
  const antes = await buscarTicket(id);
  if (!antes) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);

  if (dados.situacao !== antes.situacao) await conferirPodeFechar(id, dados.situacao);

  const mudancas = await diferencas(antes, dados);

  await db.transaction(async (tx) => {
    await atualizarTicket(id, dados, tx);
    await registrarHistoricoTicket(tx, id, usuario.id, mudancas);
  });
}

/**
 * Troca so a situacao - o caminho de um clique.
 *
 * Separado do `editarTicket` de proposito. E a acao mais frequente do suporte,
 * e obrigar a mandar os oito campos do formulario para mexer em um deles faz
 * com que duas pessoas no mesmo chamado se sobrescrevam inteiras, e nao apenas
 * no campo que cada uma tocou.
 */
export async function trocarSituacao(
  id: number,
  situacao: SituacaoTicket,
  usuario: UsuarioSessao,
): Promise<void> {
  const antes = await buscarTicket(id);
  if (!antes) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
  if (antes.situacao === situacao) return;

  await conferirPodeFechar(id, situacao);

  await db.transaction(async (tx) => {
    await atualizarSituacao(tx, id, situacao);
    await registrarHistoricoTicket(
      tx,
      id,
      usuario.id,
      registroDeSituacao(antes.situacao, situacao),
    );
  });
}

/** "Pegar para mim", sem abrir o formulario e sem procurar o proprio nome numa lista. */
export async function assumirChamado(id: number, usuario: UsuarioSessao): Promise<void> {
  const antes = await buscarTicket(id);
  if (!antes) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
  if (antes.atendenteId === usuario.id) return;

  await db.transaction(async (tx) => {
    await atualizarAtendente(tx, id, usuario.id);
    await registrarHistoricoTicket(tx, id, usuario.id, [
      { campo: "atendente", valorAntigo: antes.atendente, valorNovo: usuario.nome },
    ]);
  });
}

/**
 * Registra no atendimento e, se pedirem, muda a situacao no mesmo gesto.
 *
 * Na vida real as duas coisas sao uma so ("liguei, cliente vai testar" ->
 * aguardando cliente). Vai numa transacao para nao existir o meio-termo em que
 * a anotacao ficou gravada e a situacao nao mudou: quem lesse a timeline depois
 * entenderia que o atendente prometeu algo e nao fez.
 */
export async function registrarMensagem(
  ticketId: number,
  dados: TicketMessageInput,
  usuario: UsuarioSessao,
): Promise<string> {
  const antes = await buscarTicket(ticketId);
  if (!antes) throw new ErroDeNegocio("Este chamado nao existe mais.", 404);

  const nova = dados.situacao;
  const muda = nova !== null && nova !== antes.situacao;
  if (muda) await conferirPodeFechar(ticketId, nova);

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await inserirMensagem(id, ticketId, usuario.id, dados.corpo, dados.interno, tx);
    if (muda) {
      await atualizarSituacao(tx, ticketId, nova);
      await registrarHistoricoTicket(
        tx,
        ticketId,
        usuario.id,
        registroDeSituacao(antes.situacao, nova),
      );
    }
  });
  return id;
}

/**
 * Nao deixa resolver chamado cuja rotina de dev ainda nao foi entregue.
 *
 * Nao e burocracia: quando o dev termina, a rotina devolve o chamado ao
 * suporte. Se ele ja estivesse resolvido, ou o retorno o reabriria sozinho -
 * confundindo quem dava o assunto por encerrado - ou o retorno seria descartado
 * e ninguem ficaria sabendo que a correcao saiu.
 *
 * Cancelar continua livre: cancelar e exatamente o que se faz quando o chamado
 * nao devia ter virado desenvolvimento.
 */
async function conferirPodeFechar(id: number, situacao: SituacaoTicket): Promise<void> {
  if (situacao !== "resolvido") return;

  // null = sem rotina vinculada, nao ha o que travar.
  if ((await taskDoTicketConcluida(id)) === false) {
    throw new ErroDeNegocio(
      "A rotina de desenvolvimento deste chamado ainda nao foi entregue. " +
        "Quando ela chegar na etapa final o chamado volta para voce, e ai da para resolver.",
    );
  }
}

/**
 * Reabertura ganha linha propria, alem da troca de situacao. Contar reabertura
 * e a medida de qualidade mais honesta que um suporte tem, e ela precisa ser
 * encontravel sem ter de interpretar pares de valores no meio do historico.
 */
function registroDeSituacao(antes: SituacaoTicket, depois: SituacaoTicket): RegistroDeHistorico[] {
  const registros: RegistroDeHistorico[] = [
    {
      campo: "situacao",
      valorAntigo: ROTULO_SITUACAO_TICKET[antes],
      valorNovo: ROTULO_SITUACAO_TICKET[depois],
    },
  ];
  if (situacaoEhFechada(antes) && !situacaoEhFechada(depois)) {
    registros.push({
      campo: "reaberto",
      valorAntigo: ROTULO_SITUACAO_TICKET[antes],
      valorNovo: ROTULO_SITUACAO_TICKET[depois],
    });
  }
  return registros;
}

/**
 * O que mudou, ja em texto legivel. Guardar id de usuario aqui faria o
 * historico apontar para um cadastro que pode ser desativado depois; o nome
 * congelado no momento da mudanca e o que continua fazendo sentido daqui a anos.
 */
async function diferencas(
  antes: TicketDaLista,
  depois: AtualizarTicketInput,
): Promise<RegistroDeHistorico[]> {
  const registros: RegistroDeHistorico[] = [];

  if (antes.situacao !== depois.situacao) {
    registros.push(...registroDeSituacao(antes.situacao, depois.situacao));
  }

  if (antes.prioridade !== depois.prioridade) {
    registros.push({
      campo: "prioridade",
      valorAntigo: ROTULO_PRIORIDADE[antes.prioridade],
      valorNovo: ROTULO_PRIORIDADE[depois.prioridade],
    });
  }

  if (antes.atendenteId !== depois.atendenteId) {
    const novo = depois.atendenteId === null ? null : await buscarUsuario(depois.atendenteId);
    registros.push({
      campo: "atendente",
      valorAntigo: antes.atendente,
      valorNovo: novo?.nome ?? null,
    });
  }

  // O assunto diz o que o chamado E. Cortado no tamanho da coluna: o historico
  // aqui responde "quem renomeou isto", nao guarda o texto para reconstituicao.
  if (antes.assunto !== depois.assunto) {
    registros.push({
      campo: "assunto",
      valorAntigo: antes.assunto.slice(0, 255),
      valorNovo: depois.assunto.slice(0, 255),
    });
  }

  return registros;
}
