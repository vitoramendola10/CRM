import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db, type Tx } from "../client";
import { boardColumns, clients, tasks, ticketHistory, ticketMessages, tickets, users } from "../schema";
import { contem } from "./like";
import { POR_PAGINA, montarPagina, pularDe, type Pagina } from "@/lib/paginacao";
import { situacaoEhFechada } from "@/domain";
import type {
  AbrirTicketInput,
  AtualizarTicketInput,
  Cliente,
  FiltroTicketsInput,
  SituacaoTicket,
  Ticket,
  TicketMessage,
} from "@/domain";

/** Linha da lista de atendimentos: ja traz cliente e atendente resolvidos. */
export interface TicketDaLista extends Ticket {
  cliente: string | null;
  atendente: string | null;
  codigoTask: number | null;
  /**
   * Quando este chamado se mexeu pela ultima vez - mensagem, mudanca de
   * situacao ou, se nada aconteceu ainda, a propria abertura. E o que separa
   * "aberto ha 9 dias e andando" de "aberto ha 9 dias e esquecido".
   */
  ultimaAtividade: string;
}

/**
 * A data da ultima atividade, em SQL.
 *
 * `aberto_em` entra no GREATEST como piso: chamado recem-aberto nao tem
 * mensagem nem historico, e sem o piso a ultima atividade seria NULL - que a
 * tela leria como parado desde sempre, no minuto em que foi criado.
 */
const ultimaAtividade = sql<string>`GREATEST(
  ${tickets.abertoEm},
  COALESCE((SELECT MAX(m.created_at) FROM ticket_messages m WHERE m.ticket_id = ${tickets.id}), ${tickets.abertoEm}),
  COALESCE((SELECT MAX(h.created_at) FROM ticket_history h WHERE h.ticket_id = ${tickets.id}), ${tickets.abertoEm})
)`;

const colunas = {
  id: tickets.id,
  clientId: tickets.clientId,
  solicitante: tickets.solicitante,
  canal: tickets.canal,
  assunto: tickets.assunto,
  descricao: tickets.descricao,
  situacao: tickets.situacao,
  prioridade: tickets.prioridade,
  atendenteId: tickets.atendenteId,
  taskId: tickets.taskId,
  abertoEm: tickets.abertoEm,
  fechadoEm: tickets.fechadoEm,
};

export async function listarTickets(
  filtro: FiltroTicketsInput,
  pagina = 1,
): Promise<Pagina<TicketDaLista>> {
  const condicoes = [
    filtro.situacao ? eq(tickets.situacao, filtro.situacao) : undefined,
    filtro.clientId ? eq(tickets.clientId, filtro.clientId) : undefined,
    filtro.atendenteId ? eq(tickets.atendenteId, filtro.atendenteId) : undefined,
    filtro.busca
      ? or(like(tickets.assunto, contem(filtro.busca)), like(tickets.solicitante, contem(filtro.busca)))
      : undefined,
  ].filter((c) => c !== undefined);

  const onde = condicoes.length > 0 ? and(...condicoes) : undefined;

  // As duas consultas em paralelo: a contagem nao depende do resultado da pagina,
  // e o join da lista e caro demais para pagar duas vezes em serie.
  const [linhas, [contagem]] = await Promise.all([
    db
      .select({
        ...colunas,
        cliente: clients.razaoSocial,
        atendente: users.nome,
        codigoTask: sql<number | null>`(SELECT codigo FROM tasks WHERE tasks.id = ${tickets.taskId})`,
        ultimaAtividade,
      })
      .from(tickets)
      .leftJoin(clients, eq(clients.id, tickets.clientId))
      .leftJoin(users, eq(users.id, tickets.atendenteId))
      .where(onde)
      .orderBy(desc(tickets.abertoEm))
      .limit(POR_PAGINA)
      .offset(pularDe(pagina)),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(tickets).where(onde),
  ]);

  return montarPagina(linhas, contagem?.n ?? 0, pagina);
}

export async function buscarTicket(id: number): Promise<TicketDaLista | null> {
  const [t] = await db
    .select({
      ...colunas,
      cliente: clients.razaoSocial,
      atendente: users.nome,
      codigoTask: sql<number | null>`(SELECT codigo FROM tasks WHERE tasks.id = ${tickets.taskId})`,
      ultimaAtividade,
    })
    .from(tickets)
    .leftJoin(clients, eq(clients.id, tickets.clientId))
    .leftJoin(users, eq(users.id, tickets.atendenteId))
    .where(eq(tickets.id, id))
    .limit(1);
  return t ?? null;
}

/** Trava o chamado ate o fim da transacao. E o que impede escalar duas vezes. */
export async function travarTicket(tx: Tx, id: number): Promise<Ticket | null> {
  const [t] = await tx.select(colunas).from(tickets).where(eq(tickets.id, id)).limit(1).for("update");
  return t ?? null;
}

export async function abrirTicket(dados: AbrirTicketInput, atendenteId: string): Promise<number> {
  const r = await db.insert(tickets).values({ ...dados, atendenteId });
  // O protocolo e auto_increment: e o insertId que o usuario vai ver.
  return Number(r[0].insertId);
}

export async function atualizarTicket(
  id: number,
  dados: AtualizarTicketInput,
  tx?: Tx,
): Promise<void> {
  await (tx ?? db)
    .update(tickets)
    .set({ ...dados, fechadoEm: carimboDeFechamento(dados.situacao) })
    .where(eq(tickets.id, id));
}

/** So a situacao muda, e leva o carimbo de fechamento junto. */
export async function atualizarSituacao(
  tx: Tx,
  id: number,
  situacao: SituacaoTicket,
): Promise<void> {
  await tx
    .update(tickets)
    .set({ situacao, fechadoEm: carimboDeFechamento(situacao) })
    .where(eq(tickets.id, id));
}

export async function atualizarAtendente(
  tx: Tx,
  id: number,
  atendenteId: string | null,
): Promise<void> {
  await tx.update(tickets).set({ atendenteId }).where(eq(tickets.id, id));
}

/**
 * `fechado_em` acompanha a situacao, sempre.
 *
 * O COALESCE preserva o primeiro fechamento: salvar de novo um chamado que ja
 * estava resolvido nao deve empurrar a data para frente, senao o tempo de
 * atendimento vira o tempo desde a ultima vez que alguem mexeu na tela.
 * Saindo de resolvido/cancelado o carimbo cai para NULL - o chamado voltou a
 * estar aberto, e um chamado aberto com data de fechamento e um estado que nao
 * existe no mundo real.
 */
function carimboDeFechamento(situacao: SituacaoTicket) {
  return situacaoEhFechada(situacao)
    ? sql`COALESCE(${tickets.fechadoEm}, CURRENT_TIMESTAMP(3))`
    : null;
}

export async function vincularTask(
  tx: Tx,
  id: number,
  taskId: string,
  situacao: SituacaoTicket,
): Promise<void> {
  await tx.update(tickets).set({ taskId, situacao }).where(eq(tickets.id, id));
}

/**
 * Devolve o chamado ao suporte quando a rotina entra na etapa de entrega.
 *
 * So mexe em chamado que ainda estava esperando o dev. Sem esse filtro, um
 * chamado ja resolvido pelo atendente voltava sozinho para "em atendimento" no
 * dia em que o dev arrastasse o card - e pior, ficava `em_atendimento` com
 * `fechado_em` preenchido, que e um estado impossivel e envenena qualquer
 * medida de tempo de atendimento.
 *
 * Devolve se mudou alguma coisa, para quem chama saber se ha o que registrar.
 */
export async function devolverAoSuporte(tx: Tx, id: number): Promise<boolean> {
  const r = await tx
    .update(tickets)
    .set({ situacao: "em_atendimento" })
    .where(and(eq(tickets.id, id), eq(tickets.situacao, "aguardando_dev")));
  return r[0].affectedRows > 0;
}

/** A etapa em que a rotina esta e de entrega? E o que trava resolver cedo demais. */
export async function taskDoTicketConcluida(ticketId: number): Promise<boolean | null> {
  const [r] = await db
    .select({ isDone: boardColumns.isDone })
    .from(tickets)
    .innerJoin(tasks, eq(tasks.id, tickets.taskId))
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .where(eq(tickets.id, ticketId))
    .limit(1);
  // null = o chamado nao tem rotina vinculada; nao ha o que travar.
  return r === undefined ? null : r.isDone;
}

export async function emailDoAtendente(tx: Tx, ticketId: number): Promise<string | null> {
  const [r] = await tx
    .select({ email: users.email })
    .from(tickets)
    .innerJoin(users, eq(users.id, tickets.atendenteId))
    .where(and(eq(tickets.id, ticketId), eq(users.ativo, true)))
    .limit(1);
  return r?.email ?? null;
}

// ------------------------------------------------------------------
// Mensagens
// ------------------------------------------------------------------

export async function listarMensagens(
  ticketId: number,
): Promise<(TicketMessage & { autor: string | null })[]> {
  return db
    .select({
      id: ticketMessages.id,
      ticketId: ticketMessages.ticketId,
      userId: ticketMessages.userId,
      corpo: ticketMessages.corpo,
      interno: ticketMessages.interno,
      createdAt: ticketMessages.createdAt,
      autor: users.nome,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(users.id, ticketMessages.userId))
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(asc(ticketMessages.createdAt));
}

export async function inserirMensagem(
  id: string,
  ticketId: number,
  userId: string,
  corpo: string,
  interno: boolean,
  tx?: Tx,
): Promise<void> {
  await (tx ?? db).insert(ticketMessages).values({ id, ticketId, userId, corpo, interno });
}

// ------------------------------------------------------------------
// Historico
// ------------------------------------------------------------------

export interface RegistroDeHistorico {
  campo: string;
  valorAntigo: string | null;
  valorNovo: string | null;
}

/** Nada a gravar tambem e um caso: salvar sem mudar nada nao vira linha. */
export async function registrarHistoricoTicket(
  tx: Tx,
  ticketId: number,
  userId: string | null,
  registros: RegistroDeHistorico[],
): Promise<void> {
  if (registros.length === 0) return;
  await tx.insert(ticketHistory).values(registros.map((r) => ({ ...r, ticketId, userId })));
}

export async function listarHistoricoTicket(
  ticketId: number,
): Promise<(RegistroDeHistorico & { id: number; autor: string | null; createdAt: string })[]> {
  return db
    .select({
      id: ticketHistory.id,
      campo: ticketHistory.campo,
      valorAntigo: ticketHistory.valorAntigo,
      valorNovo: ticketHistory.valorNovo,
      autor: users.nome,
      createdAt: ticketHistory.createdAt,
    })
    .from(ticketHistory)
    .leftJoin(users, eq(users.id, ticketHistory.userId))
    .where(eq(ticketHistory.ticketId, ticketId))
    .orderBy(desc(ticketHistory.createdAt));
}

// ------------------------------------------------------------------
// Clientes (cadastro proprio, usado pelo form de abertura)
// ------------------------------------------------------------------

export async function listarClientes(apenasAtivos = true): Promise<Cliente[]> {
  return db
    .select({
      id: clients.id,
      razaoSocial: clients.razaoSocial,
      nomeFantasia: clients.nomeFantasia,
      cnpj: clients.cnpj,
      telefone: clients.telefone,
      email: clients.email,
      cidade: clients.cidade,
      uf: clients.uf,
      ativo: clients.ativo,
    })
    .from(clients)
    .where(apenasAtivos ? eq(clients.ativo, true) : undefined)
    .orderBy(asc(clients.razaoSocial));
}

export async function criarCliente(
  id: string,
  dados: Omit<Cliente, "id">,
): Promise<void> {
  await db.insert(clients).values({ id, ...dados });
}

export async function contarPorSituacao(): Promise<Record<string, number>> {
  const linhas = await db
    .select({ situacao: tickets.situacao, n: sql<number>`count(*)`.mapWith(Number) })
    .from(tickets)
    .groupBy(tickets.situacao);
  return Object.fromEntries(linhas.map((l) => [l.situacao, l.n]));
}
