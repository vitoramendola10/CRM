import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db, type Tx } from "../client";
import { clients, ticketMessages, tickets, users } from "../schema";
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
}

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

export async function listarTickets(filtro: FiltroTicketsInput): Promise<TicketDaLista[]> {
  const condicoes = [
    filtro.situacao ? eq(tickets.situacao, filtro.situacao) : undefined,
    filtro.clientId ? eq(tickets.clientId, filtro.clientId) : undefined,
    filtro.atendenteId ? eq(tickets.atendenteId, filtro.atendenteId) : undefined,
    filtro.busca
      ? or(
          like(tickets.assunto, `%${filtro.busca}%`),
          like(tickets.solicitante, `%${filtro.busca}%`),
        )
      : undefined,
  ].filter((c) => c !== undefined);

  const linhas = await db
    .select({
      ...colunas,
      cliente: clients.razaoSocial,
      atendente: users.nome,
      codigoTask: sql<number | null>`(SELECT codigo FROM tasks WHERE tasks.id = ${tickets.taskId})`,
    })
    .from(tickets)
    .leftJoin(clients, eq(clients.id, tickets.clientId))
    .leftJoin(users, eq(users.id, tickets.atendenteId))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(tickets.abertoEm))
    .limit(300);

  return linhas;
}

export async function buscarTicket(id: number): Promise<TicketDaLista | null> {
  const [t] = await db
    .select({
      ...colunas,
      cliente: clients.razaoSocial,
      atendente: users.nome,
      codigoTask: sql<number | null>`(SELECT codigo FROM tasks WHERE tasks.id = ${tickets.taskId})`,
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

export async function atualizarTicket(id: number, dados: AtualizarTicketInput): Promise<void> {
  const fechado: SituacaoTicket[] = ["resolvido", "cancelado"];
  await db
    .update(tickets)
    .set({
      ...dados,
      fechadoEm: fechado.includes(dados.situacao)
        ? sql`COALESCE(${tickets.fechadoEm}, CURRENT_TIMESTAMP(3))`
        : null,
    })
    .where(eq(tickets.id, id));
}

export async function vincularTask(
  tx: Tx,
  id: number,
  taskId: string,
  situacao: SituacaoTicket,
): Promise<void> {
  await tx.update(tickets).set({ taskId, situacao }).where(eq(tickets.id, id));
}

/** Devolve o chamado ao suporte quando a rotina entra na etapa de entrega. */
export async function devolverAoSuporte(tx: Tx, id: number): Promise<void> {
  await tx.update(tickets).set({ situacao: "em_atendimento" }).where(eq(tickets.id, id));
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
