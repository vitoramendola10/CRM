import { relations, sql } from "drizzle-orm";
import {
  type AnyMySqlColumn,
  bigint,
  boolean,
  char,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  CANAIS_TICKET,
  CATEGORIAS_STATUS,
  DESTINOS_NOTIFICACAO,
  EVENTOS_NOTIFICACAO,
  PAPEIS,
  PRIORIDADES,
  SITUACOES_OUTBOX,
  SITUACOES_TICKET,
  TIPOS_BOARD,
} from "@/domain/constants";

/**
 * Portado do crm_schema_fase1.sql (PostgreSQL) para MySQL 8+.
 * As decisoes de traducao estao em docs/portabilidade-mysql.md.
 *
 * Convencoes desta camada:
 * - id uuid     -> char(36), gerado pela aplicacao (crypto.randomUUID)
 * - timestamptz -> datetime(3) SEMPRE em UTC; a conexao fixa time_zone='+00:00'
 * - citext      -> a collation padrao utf8mb4_0900_ai_ci ja e case-insensitive
 * - updated_at  -> ON UPDATE CURRENT_TIMESTAMP(3), no lugar do trigger plpgsql
 */

const id = () => char("id", { length: 36 }).primaryKey();
const fk = (name: string) => char(name, { length: 36 });
const protocolo = (name: string) => bigint(name, { mode: "number", unsigned: true });
const ts = (name: string) => datetime(name, { mode: "string", fsp: 3 });
const agora = () => sql`CURRENT_TIMESTAMP(3)`;
const criadoEm = () => ts("created_at").notNull().default(agora());
/**
 * Equivalente do trigger set_updated_at() do Postgres. Precisa ser DDL e nao
 * `$onUpdate` do Drizzle: assim vale para qualquer UPDATE, inclusive SQL cru.
 */
const atualizadoEm = () =>
  ts("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`);
const cor = () => varchar("cor", { length: 7 }).notNull().default("#8d8577");

// =============================================================
// 1. USUARIOS E CLIENTES
// =============================================================

export const users = mysqlTable(
  "users",
  {
    id: id(),
    // Login e por username. Unico e case-insensitive pela collation da coluna.
    username: varchar("username", { length: 64 }).notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    // Opcional de proposito: so serve para receber notificacao.
    email: varchar("email", { length: 160 }),
    senhaHash: varchar("senha_hash", { length: 255 }).notNull(),
    papel: mysqlEnum("papel", PAPEIS).notNull().default("suporte"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [unique("uq_users_username").on(t.username), index("idx_users_papel").on(t.papel)],
);

export const clients = mysqlTable(
  "clients",
  {
    id: id(),
    razaoSocial: varchar("razao_social", { length: 200 }).notNull(),
    nomeFantasia: varchar("nome_fantasia", { length: 200 }),
    cnpj: varchar("cnpj", { length: 14 }),
    telefone: varchar("telefone", { length: 32 }),
    cidade: varchar("cidade", { length: 120 }),
    uf: char("uf", { length: 2 }),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  // Sem lower() como no Postgres: a collation da coluna ja ignora caixa.
  (t) => [index("idx_clients_razao").on(t.razaoSocial), index("idx_clients_cnpj").on(t.cnpj)],
);

// =============================================================
// 2. CONFIGURACAO DO KANBAN (tudo editavel pelo usuario)
// =============================================================

export const boards = mysqlTable("boards", {
  id: id(),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: mysqlEnum("tipo", TIPOS_BOARD).notNull().default("dev"),
  descricao: varchar("descricao", { length: 500 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: criadoEm(),
  updatedAt: atualizadoEm(),
});

/**
 * As etapas do processo. Nome e ordem sao livres.
 * is_done marca a coluna que dispara o retorno para o suporte.
 *
 * (board_id, ordem) continua unico, mas MySQL nao tem constraint DEFERRABLE:
 * reordenar exige duas fases dentro de uma transacao (joga tudo para ordem
 * negativa, depois grava a ordem final). Ver services/reordenar-colunas, etapa 3.
 */
export const boardColumns = mysqlTable(
  "board_columns",
  {
    id: id(),
    boardId: fk("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    nome: varchar("nome", { length: 80 }).notNull(),
    ordem: int("ordem").notNull(),
    cor: cor(),
    wipLimit: int("wip_limit"),
    isDone: boolean("is_done").notNull().default(false),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [unique("uq_board_columns_ordem").on(t.boardId, t.ordem)],
);

/**
 * Status da tarefa. O NOME o usuario muda a vontade.
 * A CATEGORIA e fixa e e o que relatorio/automacao le.
 */
export const taskStatuses = mysqlTable("task_statuses", {
  id: id(),
  nome: varchar("nome", { length: 80 }).notNull(),
  categoria: mysqlEnum("categoria", CATEGORIAS_STATUS).notNull(),
  cor: cor(),
  ordem: int("ordem").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: criadoEm(),
  updatedAt: atualizadoEm(),
});

export const taskTypes = mysqlTable("task_types", {
  id: id(),
  nome: varchar("nome", { length: 80 }).notNull(),
  icone: varchar("icone", { length: 40 }),
  cor: cor(),
  ativo: boolean("ativo").notNull().default(true),
});

// =============================================================
// 3. SUPORTE (atendimento preenchido na mao)
// =============================================================

export const tickets = mysqlTable(
  "tickets",
  {
    // Numero do protocolo, sequencial e visivel para o usuario.
    id: protocolo("id").autoincrement().primaryKey(),
    clientId: fk("client_id").references(() => clients.id),
    solicitante: varchar("solicitante", { length: 120 }),
    canal: mysqlEnum("canal", CANAIS_TICKET).notNull().default("manual"),
    assunto: varchar("assunto", { length: 200 }).notNull(),
    descricao: text("descricao"),
    situacao: mysqlEnum("situacao", SITUACOES_TICKET).notNull().default("aberto"),
    prioridade: mysqlEnum("prioridade", PRIORIDADES).notNull().default("media"),
    atendenteId: fk("atendente_id").references(() => users.id),
    /**
     * Volta para o dev. tickets e tasks se referenciam mutuamente; a anotacao
     * explicita de retorno e o que impede o TypeScript de entrar em loop de
     * inferencia. Sem ela, as duas tabelas viram `any`.
     */
    taskId: fk("task_id").references((): AnyMySqlColumn => tasks.id),
    abertoEm: ts("aberto_em").notNull().default(agora()),
    fechadoEm: ts("fechado_em"),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [
    index("idx_tickets_situacao").on(t.situacao),
    index("idx_tickets_client").on(t.clientId),
    index("idx_tickets_atendente").on(t.atendenteId),
  ],
);

/** Timeline do atendimento. interno = nao mostra pro cliente no futuro portal. */
export const ticketMessages = mysqlTable(
  "ticket_messages",
  {
    id: id(),
    ticketId: protocolo("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: fk("user_id").references(() => users.id),
    corpo: text("corpo").notNull(),
    interno: boolean("interno").notNull().default(true),
    createdAt: criadoEm(),
  },
  (t) => [index("idx_ticket_messages_ticket").on(t.ticketId, t.createdAt)],
);

// =============================================================
// 4. DEV (a rotina que o suporte gera)
// =============================================================

export const tasks = mysqlTable(
  "tasks",
  {
    id: id(),
    /**
     * DEV-1, DEV-2... MySQL so aceita uma coluna auto_increment e ela precisa
     * ser chave: dai o UNIQUE em `codigo` mais abaixo.
     */
    codigo: protocolo("codigo").autoincrement().notNull(),
    boardId: fk("board_id")
      .notNull()
      .references(() => boards.id),
    columnId: fk("column_id")
      .notNull()
      .references(() => boardColumns.id),
    statusId: fk("status_id")
      .notNull()
      .references(() => taskStatuses.id),
    typeId: fk("type_id").references(() => taskTypes.id),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    descricao: text("descricao"),
    passosRepro: text("passos_repro"),
    versaoSistema: varchar("versao_sistema", { length: 60 }),
    prioridade: mysqlEnum("prioridade", PRIORIDADES).notNull().default("media"),
    assigneeId: fk("assignee_id").references(() => users.id),
    criadoPor: fk("criado_por").references(() => users.id),
    clientId: fk("client_id").references(() => clients.id),
    ticketId: protocolo("ticket_id").references(() => tickets.id),
    estimativaH: decimal("estimativa_h", { precision: 6, scale: 2, mode: "number" }),
    prazo: date("prazo", { mode: "string" }),
    // LexoRank: ordem dentro da coluna, recalculada com 1 UPDATE por movimento.
    rank: varchar("rank", { length: 64 }).notNull(),
    // Preenchido ao entrar na primeira coluna de andamento. Base do cycle time.
    iniciadoEm: ts("iniciado_em"),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [
    unique("uq_tasks_codigo").on(t.codigo),
    index("idx_tasks_coluna").on(t.columnId, t.rank),
    index("idx_tasks_assignee").on(t.assigneeId),
    index("idx_tasks_ticket").on(t.ticketId),
    index("idx_tasks_board").on(t.boardId),
  ],
);

export const taskComments = mysqlTable(
  "task_comments",
  {
    id: id(),
    taskId: fk("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: fk("user_id").references(() => users.id),
    corpo: text("corpo").notNull(),
    createdAt: criadoEm(),
  },
  (t) => [index("idx_task_comments_task").on(t.taskId, t.createdAt)],
);

/** De onde saem lead time, cycle time e o "quem mexeu nisso". */
export const taskHistory = mysqlTable(
  "task_history",
  {
    id: protocolo("id").autoincrement().primaryKey(),
    taskId: fk("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: fk("user_id").references(() => users.id),
    campo: varchar("campo", { length: 40 }).notNull(),
    valorAntigo: varchar("valor_antigo", { length: 255 }),
    valorNovo: varchar("valor_novo", { length: 255 }),
    createdAt: criadoEm(),
  },
  (t) => [index("idx_task_history_task").on(t.taskId, t.createdAt)],
);

// =============================================================
// 5. NOTIFICACOES
// =============================================================

export const notificationRules = mysqlTable(
  "notification_rules",
  {
    id: id(),
    evento: mysqlEnum("evento", EVENTOS_NOTIFICACAO).notNull(),
    // null = vale para qualquer board.
    boardId: fk("board_id").references(() => boards.id, { onDelete: "cascade" }),
    destinoTipo: mysqlEnum("destino_tipo", DESTINOS_NOTIFICACAO).notNull(),
    destinoPapel: mysqlEnum("destino_papel", PAPEIS),
    // Postgres usaria uuid[]; em MySQL vira um array JSON de uuid.
    destinoUsers: json("destino_users").$type<string[] | null>(),
    assuntoTpl: varchar("assunto_tpl", { length: 200 }).notNull(),
    corpoTpl: text("corpo_tpl").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index("idx_notification_rules_evento").on(t.evento, t.ativo)],
);

/**
 * Fila de e-mail. Escrita na MESMA transacao do fato que a originou;
 * o worker consome com SELECT ... FOR UPDATE SKIP LOCKED.
 */
export const notificationOutbox = mysqlTable(
  "notification_outbox",
  {
    id: protocolo("id").autoincrement().primaryKey(),
    ruleId: fk("rule_id").references(() => notificationRules.id, { onDelete: "set null" }),
    // Texto solto, nao enum: a linha sobrevive a regra que a gerou.
    evento: varchar("evento", { length: 40 }).notNull(),
    taskId: fk("task_id").references(() => tasks.id, { onDelete: "set null" }),
    ticketId: protocolo("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    destinatarios: json("destinatarios").$type<string[]>().notNull(),
    assunto: varchar("assunto", { length: 200 }).notNull(),
    corpo: text("corpo").notNull(),
    situacao: mysqlEnum("situacao", SITUACOES_OUTBOX).notNull().default("pendente"),
    tentativas: int("tentativas").notNull().default(0),
    ultimoErro: varchar("ultimo_erro", { length: 500 }),
    proximaTentativa: ts("proxima_tentativa").notNull().default(agora()),
    enviadoEm: ts("enviado_em"),
    createdAt: criadoEm(),
  },
  // Indice que o worker varre a cada 30s.
  (t) => [index("idx_outbox_pendente").on(t.situacao, t.proximaTentativa)],
);

// =============================================================
// 6. SESSOES (auth propria, etapa 2)
// =============================================================

export const sessions = mysqlTable(
  "sessions",
  {
    // Hash SHA-256 do token que vai no cookie; o token cru nunca toca o banco.
    id: char("id", { length: 64 }).primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiraEm: ts("expira_em").notNull(),
    createdAt: criadoEm(),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

// =============================================================
// RELATIONS
// =============================================================

export const usersRelations = relations(users, ({ many }) => ({
  tasksAtribuidas: many(tasks, { relationName: "assignee" }),
  ticketsAtendidos: many(tickets),
  sessions: many(sessions),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  tickets: many(tickets),
  tasks: many(tasks),
}));

export const boardsRelations = relations(boards, ({ many }) => ({
  columns: many(boardColumns),
  tasks: many(tasks),
}));

export const boardColumnsRelations = relations(boardColumns, ({ one, many }) => ({
  board: one(boards, { fields: [boardColumns.boardId], references: [boards.id] }),
  tasks: many(tasks),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  client: one(clients, { fields: [tickets.clientId], references: [clients.id] }),
  atendente: one(users, { fields: [tickets.atendenteId], references: [users.id] }),
  mensagens: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketMessages.ticketId], references: [tickets.id] }),
  autor: one(users, { fields: [ticketMessages.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  board: one(boards, { fields: [tasks.boardId], references: [boards.id] }),
  coluna: one(boardColumns, { fields: [tasks.columnId], references: [boardColumns.id] }),
  status: one(taskStatuses, { fields: [tasks.statusId], references: [taskStatuses.id] }),
  tipo: one(taskTypes, { fields: [tasks.typeId], references: [taskTypes.id] }),
  cliente: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  ticket: one(tickets, { fields: [tasks.ticketId], references: [tickets.id] }),
  responsavel: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  autor: one(users, { fields: [tasks.criadoPor], references: [users.id] }),
  comentarios: many(taskComments),
  historico: many(taskHistory),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  autor: one(users, { fields: [taskComments.userId], references: [users.id] }),
}));

export const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
  task: one(tasks, { fields: [taskHistory.taskId], references: [tasks.id] }),
  autor: one(users, { fields: [taskHistory.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
