import { desc, like, or, sql } from "drizzle-orm";
import { db } from "../client";
import { clients, tasks, tickets } from "../schema";
import { contem } from "./like";

/**
 * Busca unica sobre tudo que se procura no dia a dia.
 *
 * Antes so existia busca de chamado por assunto e solicitante. Achar "aquele
 * bug do boleto de junho" nao tinha caminho: a descricao, os passos de repro, o
 * comentario do dev e a mensagem do atendimento eram invisiveis.
 *
 * Sao consultas separadas por tipo, e nao um UNION: cada tabela tem colunas
 * diferentes e o UNION obrigaria a inventar colunas vazias para casar as
 * formas. Em paralelo, o custo e o da mais lenta e nao a soma.
 */

export type TipoResultado = "chamado" | "rotina" | "cliente";

export interface Resultado {
  tipo: TipoResultado;
  /** Para onde o link leva. */
  href: string;
  /** "#12" ou "DEV-7". Vazio para cliente. */
  codigo: string;
  titulo: string;
  /** Onde o termo apareceu, quando nao foi no titulo. */
  contexto: string | null;
  data: string | null;
}

/** Um trecho em volta do termo. O corpo inteiro na lista viraria parede de texto. */
function trecho(texto: string | null, termo: string): string | null {
  if (!texto) return null;
  const i = texto.toLowerCase().indexOf(termo.toLowerCase());
  if (i === -1) return null;
  const de = Math.max(0, i - 40);
  const ate = Math.min(texto.length, i + termo.length + 60);
  return `${de > 0 ? "..." : ""}${texto.slice(de, ate).replace(/\s+/g, " ")}${ate < texto.length ? "..." : ""}`;
}

const LIMITE_POR_TIPO = 20;

export async function buscar(
  termo: string,
  podeVerClientes: boolean,
): Promise<Record<TipoResultado, Resultado[]>> {
  const p = contem(termo);
  const digitos = termo.replace(/\D/g, "");

  const [chamados, rotinas, clientesAchados] = await Promise.all([
    db
      .select({
        id: tickets.id,
        assunto: tickets.assunto,
        descricao: tickets.descricao,
        solicitante: tickets.solicitante,
        abertoEm: tickets.abertoEm,
        // A mensagem que casou, se o termo nao estava no chamado em si.
        mensagem: sql<string | null>`(
          SELECT m.corpo FROM ticket_messages m
          WHERE m.ticket_id = ${tickets.id} AND m.corpo LIKE ${p}
          ORDER BY m.created_at DESC LIMIT 1
        )`,
      })
      .from(tickets)
      .where(
        or(
          like(tickets.assunto, p),
          like(tickets.descricao, p),
          like(tickets.solicitante, p),
          sql`EXISTS (SELECT 1 FROM ticket_messages m WHERE m.ticket_id = ${tickets.id} AND m.corpo LIKE ${p})`,
        ),
      )
      .orderBy(desc(tickets.abertoEm))
      .limit(LIMITE_POR_TIPO),

    db
      .select({
        codigo: tasks.codigo,
        titulo: tasks.titulo,
        descricao: tasks.descricao,
        passosRepro: tasks.passosRepro,
        createdAt: tasks.createdAt,
        comentario: sql<string | null>`(
          SELECT c.corpo FROM task_comments c
          WHERE c.task_id = ${tasks.id} AND c.corpo LIKE ${p}
          ORDER BY c.created_at DESC LIMIT 1
        )`,
      })
      .from(tasks)
      .where(
        or(
          like(tasks.titulo, p),
          like(tasks.descricao, p),
          like(tasks.passosRepro, p),
          like(tasks.versaoSistema, p),
          sql`EXISTS (SELECT 1 FROM task_comments c WHERE c.task_id = ${tasks.id} AND c.corpo LIKE ${p})`,
        ),
      )
      .orderBy(desc(tasks.createdAt))
      .limit(LIMITE_POR_TIPO),

    // Cliente e cadastro, que so admin e gestor enxergam. Buscar sem esse
    // filtro devolveria pela busca o que a tela de configuracao esconde.
    podeVerClientes
      ? db
          .select({
            id: clients.id,
            razaoSocial: clients.razaoSocial,
            nomeFantasia: clients.nomeFantasia,
            cidade: clients.cidade,
          })
          .from(clients)
          .where(
            or(
              like(clients.razaoSocial, p),
              like(clients.nomeFantasia, p),
              // So procura por CNPJ se o termo tiver digito. Sem esta guarda,
              // `contem("")` vira `%%` e casa TODO cliente com CNPJ - qualquer
              // busca por texto devolveria a lista inteira de clientes junto.
              digitos ? like(clients.cnpj, contem(digitos)) : undefined,
            ),
          )
          .limit(LIMITE_POR_TIPO)
      : Promise.resolve([]),
  ]);

  return {
    chamado: chamados.map((t) => ({
      tipo: "chamado" as const,
      href: `/atendimentos/${t.id}`,
      codigo: `#${t.id}`,
      titulo: t.assunto,
      contexto:
        trecho(t.mensagem, termo) ?? trecho(t.descricao, termo) ?? trecho(t.solicitante, termo),
      data: t.abertoEm,
    })),
    rotina: rotinas.map((k) => ({
      tipo: "rotina" as const,
      href: `/kanban/${k.codigo}`,
      codigo: `DEV-${k.codigo}`,
      titulo: k.titulo,
      contexto:
        trecho(k.comentario, termo) ?? trecho(k.descricao, termo) ?? trecho(k.passosRepro, termo),
      data: k.createdAt,
    })),
    cliente: clientesAchados.map((c) => ({
      tipo: "cliente" as const,
      href: `/config/clientes?busca=${encodeURIComponent(c.razaoSocial)}`,
      codigo: "",
      titulo: c.razaoSocial,
      contexto: [c.nomeFantasia, c.cidade].filter(Boolean).join(" - ") || null,
      data: null,
    })),
  };
}
