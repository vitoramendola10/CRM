import { z } from "zod";
import {
  CANAIS_TICKET,
  CATEGORIAS_STATUS,
  DESTINOS_NOTIFICACAO,
  EVENTOS_NOTIFICACAO,
  PAPEIS,
  PRIORIDADES,
  SITUACOES_TICKET,
  TIPOS_BOARD,
} from "./constants";

/**
 * Todo payload que entra por rota HTTP passa por um destes.
 * O tipo inferido de cada schema e o que o service recebe - nunca `unknown` solto,
 * nunca `any`.
 */

const uuid = z.uuid("Identificador invalido");
const texto = (max: number) => z.string().trim().min(1, "Campo obrigatorio").max(max);
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .default(null);

/** Cor em hex de 6 digitos. E o formato gravado no banco. */
const corHex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #rrggbb");

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuario").max(64),
  senha: z.string().min(1, "Informe a senha").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ------------------------------------------------------------------
// Usuarios
// ------------------------------------------------------------------

/** Username so aceita o que da pra digitar sem ambiguidade num login. */
const username = z
  .string()
  .trim()
  .min(3, "Minimo de 3 caracteres")
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, numeros, ponto, hifen ou underline");

export const criarUsuarioSchema = z.object({
  username,
  nome: texto(120),
  email: z.email("E-mail invalido").max(160).nullable().default(null),
  papel: z.enum(PAPEIS),
  senha: z.string().min(8, "Minimo de 8 caracteres").max(200),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const atualizarUsuarioSchema = z.object({
  nome: texto(120),
  email: z.email("E-mail invalido").max(160).nullable().default(null),
  papel: z.enum(PAPEIS),
  ativo: z.boolean(),
});
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>;

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual"),
  senhaNova: z.string().min(8, "Minimo de 8 caracteres").max(200),
});
export type TrocarSenhaInput = z.infer<typeof trocarSenhaSchema>;

// ------------------------------------------------------------------
// Clientes
// ------------------------------------------------------------------

export const clienteSchema = z.object({
  razaoSocial: texto(200),
  nomeFantasia: textoOpcional(200),
  // Guardamos so os digitos; a mascara e problema da tela.
  cnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 0 || v.length === 14, "CNPJ deve ter 14 digitos")
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .default(null),
  telefone: textoOpcional(32),
  cidade: textoOpcional(120),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras")
    .nullable()
    .default(null),
  ativo: z.boolean().default(true),
});
export type ClienteInput = z.infer<typeof clienteSchema>;

// ------------------------------------------------------------------
// Configuracao do Kanban
// ------------------------------------------------------------------

export const boardSchema = z.object({
  nome: texto(120),
  tipo: z.enum(TIPOS_BOARD),
  descricao: textoOpcional(500),
  ativo: z.boolean().default(true),
});
export type BoardInput = z.infer<typeof boardSchema>;

export const boardColumnSchema = z.object({
  boardId: uuid,
  nome: texto(80),
  cor: corHex,
  wipLimit: z.number().int().positive().max(999).nullable().default(null),
  isDone: z.boolean().default(false),
});
export type BoardColumnInput = z.infer<typeof boardColumnSchema>;

/** Reordenacao manda a coluna inteira de uma vez: e o unico jeito de manter `ordem` unica. */
export const reordenarColunasSchema = z.object({
  boardId: uuid,
  ids: z.array(uuid).min(1),
});
export type ReordenarColunasInput = z.infer<typeof reordenarColunasSchema>;

export const taskStatusSchema = z.object({
  nome: texto(80),
  // A categoria fica no schema porque a criacao precisa dela.
  // A tela comum de renomear NAO envia este campo: renomear nunca muda categoria.
  categoria: z.enum(CATEGORIAS_STATUS),
  cor: corHex,
  ordem: z.number().int().min(0).max(999),
  ativo: z.boolean().default(true),
});
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;

/** O que a tela comum pode alterar num status. Sem `categoria` de proposito. */
export const renomearStatusSchema = taskStatusSchema.omit({ categoria: true });
export type RenomearStatusInput = z.infer<typeof renomearStatusSchema>;

export const taskTypeSchema = z.object({
  nome: texto(80),
  cor: corHex,
  ativo: z.boolean().default(true),
});
export type TaskTypeInput = z.infer<typeof taskTypeSchema>;

// ------------------------------------------------------------------
// Suporte
// ------------------------------------------------------------------

export const abrirTicketSchema = z.object({
  clientId: uuid.nullable().default(null),
  solicitante: textoOpcional(120),
  canal: z.enum(CANAIS_TICKET).default("manual"),
  assunto: texto(200),
  descricao: textoOpcional(5000),
  prioridade: z.enum(PRIORIDADES).default("media"),
});
export type AbrirTicketInput = z.infer<typeof abrirTicketSchema>;

export const atualizarTicketSchema = z.object({
  clientId: uuid.nullable().default(null),
  solicitante: textoOpcional(120),
  canal: z.enum(CANAIS_TICKET),
  assunto: texto(200),
  descricao: textoOpcional(5000),
  situacao: z.enum(SITUACOES_TICKET),
  prioridade: z.enum(PRIORIDADES),
  atendenteId: uuid.nullable().default(null),
});
export type AtualizarTicketInput = z.infer<typeof atualizarTicketSchema>;

export const ticketMessageSchema = z.object({
  corpo: texto(5000),
  interno: z.boolean().default(true),
});
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;

export const filtroTicketsSchema = z.object({
  situacao: z.enum(SITUACOES_TICKET).nullable().default(null),
  clientId: uuid.nullable().default(null),
  atendenteId: uuid.nullable().default(null),
  busca: textoOpcional(120),
});
export type FiltroTicketsInput = z.infer<typeof filtroTicketsSchema>;

// ------------------------------------------------------------------
// Dev
// ------------------------------------------------------------------

/** O que o modal "Enviar para desenvolvimento" manda. */
export const escalarTicketSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  boardId: uuid,
  typeId: uuid.nullable().default(null),
  titulo: texto(200),
  descricao: textoOpcional(5000),
  passosRepro: textoOpcional(5000),
  versaoSistema: textoOpcional(60),
  prioridade: z.enum(PRIORIDADES),
});
export type EscalarTicketInput = z.infer<typeof escalarTicketSchema>;

export const atualizarTaskSchema = z.object({
  titulo: texto(200),
  descricao: textoOpcional(5000),
  passosRepro: textoOpcional(5000),
  versaoSistema: textoOpcional(60),
  typeId: uuid.nullable().default(null),
  statusId: uuid,
  prioridade: z.enum(PRIORIDADES),
  assigneeId: uuid.nullable().default(null),
  clientId: uuid.nullable().default(null),
  estimativaH: z.number().nonnegative().max(9999).nullable().default(null),
  prazo: z.iso.date().nullable().default(null),
});
export type AtualizarTaskInput = z.infer<typeof atualizarTaskSchema>;

/**
 * Drag & drop. O client manda os vizinhos, nao a posicao:
 * o rank e calculado entre `antesDeId` e `depoisDeId`, sem reordenar a coluna.
 */
export const moverTaskSchema = z.object({
  taskId: uuid,
  columnId: uuid,
  antesDeId: uuid.nullable().default(null),
  depoisDeId: uuid.nullable().default(null),
});
export type MoverTaskInput = z.infer<typeof moverTaskSchema>;

export const taskCommentSchema = z.object({
  corpo: texto(5000),
});
export type TaskCommentInput = z.infer<typeof taskCommentSchema>;

export const filtroKanbanSchema = z.object({
  boardId: uuid,
  apenasMinhas: z.boolean().default(false),
});
export type FiltroKanbanInput = z.infer<typeof filtroKanbanSchema>;

// ------------------------------------------------------------------
// Notificacoes
// ------------------------------------------------------------------

export const notificationRuleSchema = z
  .object({
    evento: z.enum(EVENTOS_NOTIFICACAO),
    boardId: uuid.nullable().default(null),
    destinoTipo: z.enum(DESTINOS_NOTIFICACAO),
    destinoPapel: z.enum(PAPEIS).nullable().default(null),
    destinoUsers: z.array(uuid).nullable().default(null),
    assuntoTpl: texto(200),
    corpoTpl: texto(5000),
    ativo: z.boolean().default(true),
  })
  .refine((r) => r.destinoTipo !== "papel" || r.destinoPapel !== null, {
    message: "Escolha o papel que recebe a notificacao",
    path: ["destinoPapel"],
  })
  .refine((r) => r.destinoTipo !== "usuarios" || (r.destinoUsers?.length ?? 0) > 0, {
    message: "Escolha pelo menos um usuario",
    path: ["destinoUsers"],
  });
export type NotificationRuleInput = z.infer<typeof notificationRuleSchema>;
