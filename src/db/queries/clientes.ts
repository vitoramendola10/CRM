import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../client";
import { clients, tasks, tickets } from "../schema";
import type { Cliente, ClienteInput } from "@/domain";

/** Cliente com o que ele ja gerou - a lista mostra isso antes de deixar desativar. */
export interface ClienteDaLista extends Cliente {
  chamados: number;
  rotinas: number;
}

const colunas = {
  id: clients.id,
  razaoSocial: clients.razaoSocial,
  nomeFantasia: clients.nomeFantasia,
  cnpj: clients.cnpj,
  telefone: clients.telefone,
  email: clients.email,
  cidade: clients.cidade,
  uf: clients.uf,
  ativo: clients.ativo,
};

export async function listarClientesCompleto(busca?: string): Promise<ClienteDaLista[]> {
  const filtro = busca?.trim();
  return db
    .select({
      ...colunas,
      chamados: sql<number>`(select count(*) from ${tickets} where ${tickets.clientId} = ${clients.id})`.mapWith(
        Number,
      ),
      rotinas: sql<number>`(select count(*) from ${tasks} where ${tasks.clientId} = ${clients.id})`.mapWith(
        Number,
      ),
    })
    .from(clients)
    .where(
      filtro
        ? or(
            like(clients.razaoSocial, `%${filtro}%`),
            like(clients.nomeFantasia, `%${filtro}%`),
            like(clients.cnpj, `%${filtro.replace(/\D/g, "")}%`),
          )
        : undefined,
    )
    .orderBy(asc(clients.razaoSocial))
    .limit(300);
}

export async function buscarCliente(id: string): Promise<Cliente | null> {
  const [c] = await db.select(colunas).from(clients).where(eq(clients.id, id)).limit(1);
  return c ?? null;
}

/** CNPJ e opcional, mas quando informado nao pode repetir. */
export async function cnpjEmUso(cnpj: string, exceto?: string): Promise<boolean> {
  const linhas = await db
    .select({ id: clients.id })
    .from(clients)
    .where(exceto ? and(eq(clients.cnpj, cnpj)) : eq(clients.cnpj, cnpj))
    .limit(2);
  return linhas.some((l) => l.id !== exceto);
}

export async function inserirCliente(id: string, dados: ClienteInput): Promise<void> {
  await db.insert(clients).values({ id, ...dados });
}

export async function atualizarCliente(id: string, dados: ClienteInput): Promise<void> {
  await db.update(clients).set(dados).where(eq(clients.id, id));
}

export async function contarVinculos(id: string): Promise<number> {
  const [r] = await db
    .select({
      n: sql<number>`(select count(*) from ${tickets} where ${tickets.clientId} = ${id})
                    + (select count(*) from ${tasks} where ${tasks.clientId} = ${id})`.mapWith(Number),
    })
    .from(clients)
    .where(eq(clients.id, id));
  return r?.n ?? 0;
}

export async function removerCliente(id: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, id));
}
