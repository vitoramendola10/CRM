import "./load-env";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./client";
import { boardColumns, boards, notificationRules, taskStatuses, taskTypes, users } from "./schema";
import { COR_CATEGORIA, COR_NEUTRA_COLUNA } from "@/domain/constants";
import { gerarHash } from "@/lib/password";

/**
 * Estado inicial minimo para o sistema abrir: as etapas do processo, os status,
 * os tipos de rotina e um administrador. Nada alem disso - sem dados de exemplo.
 *
 * Idempotente: pode rodar de novo sem duplicar. Nao sobrescreve o que voce editou.
 */

const STATUS = [
  { nome: "Aguardando", categoria: "aberto", ordem: 1, cor: COR_CATEGORIA.aberto },
  { nome: "Em analise", categoria: "andamento", ordem: 2, cor: "#5b7fa6" },
  { nome: "Em desenvolvimento", categoria: "andamento", ordem: 3, cor: COR_CATEGORIA.andamento },
  { nome: "Em teste", categoria: "andamento", ordem: 4, cor: "#6b5ea8" },
  { nome: "Concluido", categoria: "concluido", ordem: 5, cor: COR_CATEGORIA.concluido },
  { nome: "Cancelado", categoria: "cancelado", ordem: 6, cor: COR_CATEGORIA.cancelado },
] as const;

const TIPOS = [
  { nome: "Bug", cor: "#c0392b" },
  { nome: "Melhoria", cor: "#3f6ea8" },
  { nome: "Nova rotina", cor: "#4a7c59" },
  { nome: "Ajuste fiscal", cor: "#c99a3f" },
] as const;

const COLUNAS = [
  { nome: "Backlog", isDone: false },
  { nome: "Em analise", isDone: false },
  { nome: "Desenvolvimento", isDone: false },
  { nome: "Homologacao", isDone: false },
  { nome: "Pronto para entrega", isDone: true },
] as const;

/**
 * Regras de notificacao minimas.
 *
 * Sem nenhuma regra, `enfileirarEvento` resolve zero destinatarios e o evento
 * some sem deixar rastro - foi o que aconteceu ate agora: a escalacao
 * enfileirava "task_criada" e ninguem nunca era avisado de nada.
 *
 * `boardId: null` = vale para qualquer board, inclusive os que forem criados
 * depois. Sao um ponto de partida para editar em Configuracao > Notificacoes,
 * nao uma politica definitiva.
 */
const REGRAS = [
  {
    evento: "task_criada",
    destinoTipo: "papel",
    destinoPapel: "dev",
    assuntoTpl: "DEV-{{codigo}}: {{titulo}}",
    corpoTpl:
      "Chegou uma rotina nova em {{etapa}}, ainda sem responsavel.\n\n" +
      "DEV-{{codigo}} - {{titulo}}\n" +
      "Prioridade: {{prioridade}}\n" +
      "Chamado de origem: #{{protocolo}} ({{solicitante}})\n" +
      "Enviada por: {{autor}}",
  },
  {
    evento: "task_atribuida",
    destinoTipo: "responsavel",
    destinoPapel: null,
    assuntoTpl: "DEV-{{codigo}} e sua: {{titulo}}",
    corpoTpl:
      "{{responsavel}} colocou esta rotina no seu nome.\n\n" +
      "DEV-{{codigo}} - {{titulo}}\n" +
      "Chamado de origem: #{{protocolo}}",
  },
  {
    evento: "task_concluida",
    destinoTipo: "responsavel",
    destinoPapel: null,
    assuntoTpl: "Entregue: DEV-{{codigo}} do chamado #{{protocolo}}",
    corpoTpl:
      "A rotina do seu chamado chegou em {{etapa}} e o chamado voltou para voce.\n\n" +
      "DEV-{{codigo}} - {{titulo}}\n" +
      "Entregue por: {{responsavel}}",
  },
  {
    evento: "task_comentada",
    destinoTipo: "mencionados",
    destinoPapel: null,
    assuntoTpl: "{{autor}} citou voce em DEV-{{codigo}}",
    corpoTpl:
      "{{autor}} escreveu na rotina DEV-{{codigo}} - {{titulo}}:\n\n" +
      "{{comentario}}\n\n" +
      "Chamado de origem: #{{protocolo}}",
  },
  {
    evento: "ticket_mencionado",
    destinoTipo: "mencionados",
    destinoPapel: null,
    assuntoTpl: "{{autor}} citou voce no chamado #{{protocolo}}",
    corpoTpl:
      "{{autor}} citou voce {{onde}}:\n\n" +
      "#{{protocolo}} - {{assunto}}\n\n" +
      "{{trecho}}",
  },
  {
    evento: "ticket_aberto",
    destinoTipo: "papel",
    destinoPapel: "suporte",
    assuntoTpl: "Chamado #{{protocolo}}: {{assunto}}",
    corpoTpl:
      "Chamado aberto por {{atendente}}.\n\n" +
      "#{{protocolo}} - {{assunto}}\n" +
      "Solicitante: {{solicitante}}\n" +
      "Prioridade: {{prioridade}}",
  },
] as const;

async function main(): Promise<void> {
  const avisos: string[] = [];

  await db.transaction(async (tx) => {
    // ---------------- status ----------------
    const statusExistentes = await tx.select({ n: sql<number>`count(*)` }).from(taskStatuses);
    if ((statusExistentes[0]?.n ?? 0) === 0) {
      await tx.insert(taskStatuses).values(
        STATUS.map((s) => ({
          id: randomUUID(),
          nome: s.nome,
          categoria: s.categoria,
          ordem: s.ordem,
          cor: s.cor,
        })),
      );
      console.log(`+ ${STATUS.length} status`);
    } else {
      avisos.push("status ja existiam, mantidos como estao");
    }

    // ---------------- tipos ----------------
    const tiposExistentes = await tx.select({ n: sql<number>`count(*)` }).from(taskTypes);
    if ((tiposExistentes[0]?.n ?? 0) === 0) {
      await tx
        .insert(taskTypes)
        .values(TIPOS.map((t) => ({ id: randomUUID(), nome: t.nome, cor: t.cor })));
      console.log(`+ ${TIPOS.length} tipos de rotina`);
    } else {
      avisos.push("tipos ja existiam, mantidos como estao");
    }

    // ---------------- board + colunas ----------------
    const boardsExistentes = await tx.select({ n: sql<number>`count(*)` }).from(boards);
    if ((boardsExistentes[0]?.n ?? 0) === 0) {
      const boardId = randomUUID();
      await tx.insert(boards).values({
        id: boardId,
        nome: "Desenvolvimento",
        tipo: "dev",
        descricao: "Board principal das rotinas geradas pelo suporte",
      });
      await tx.insert(boardColumns).values(
        COLUNAS.map((c, i) => ({
          id: randomUUID(),
          boardId,
          nome: c.nome,
          ordem: i + 1,
          cor: COR_NEUTRA_COLUNA,
          isDone: c.isDone,
        })),
      );
      console.log(`+ board "Desenvolvimento" com ${COLUNAS.length} colunas`);
    } else {
      avisos.push("board ja existia, colunas mantidas como estao");
    }

    // ---------------- admin ----------------
    const admin = await tx.select({ id: users.id }).from(users).where(eq(users.username, "admin"));
    if (admin.length === 0) {
      const senha = process.env.SEED_ADMIN_PASSWORD?.trim() || "admin";
      await tx.insert(users).values({
        id: randomUUID(),
        username: "admin",
        nome: "Administrador",
        email: null,
        senhaHash: await gerarHash(senha),
        papel: "admin",
      });
      console.log('+ usuario "admin"');
      if (!process.env.SEED_ADMIN_PASSWORD?.trim()) {
        avisos.push('SENHA DO ADMIN E "admin" - troque no primeiro login');
      }
    } else {
      avisos.push('usuario "admin" ja existia, senha nao foi alterada');
    }

    // ---------------- regras de notificacao ----------------
    // Uma a uma, e nao tudo-ou-nada: quem ja rodou o seed antes desta parte
    // existir recebe so o que falta, sem duplicar o que ja editou.
    let novas = 0;
    for (const r of REGRAS) {
      const ja = await tx
        .select({ id: notificationRules.id })
        .from(notificationRules)
        .where(eq(notificationRules.evento, r.evento));
      if (ja.length > 0) continue;

      await tx.insert(notificationRules).values({
        id: randomUUID(),
        evento: r.evento,
        boardId: null,
        destinoTipo: r.destinoTipo,
        destinoPapel: r.destinoPapel,
        destinoUsers: null,
        assuntoTpl: r.assuntoTpl,
        corpoTpl: r.corpoTpl,
      });
      novas++;
    }
    if (novas > 0) console.log(`+ ${novas} regra(s) de notificacao`);

    if (!process.env.SMTP_HOST?.trim()) {
      avisos.push(
        "SMTP_HOST nao configurado: as regras existem, mas o worker so imprime no console",
      );
    }
  });

  if (avisos.length > 0) {
    console.log("");
    for (const a of avisos) console.log(`! ${a}`);
  }
  console.log("\nseed concluido");
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
