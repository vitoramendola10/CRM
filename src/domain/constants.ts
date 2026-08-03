import type {
  CanalTicket,
  CategoriaStatus,
  DestinoNotificacao,
  EventoNotificacao,
  Papel,
  Prioridade,
  SituacaoOutbox,
  SituacaoTicket,
  TipoBoard,
} from "./types";

/**
 * Estas listas sao a unica fonte de valores de enum do sistema.
 * Elas alimentam o zod, o schema do banco e os selects da UI ao mesmo tempo:
 * acrescentar um valor aqui e um erro de compilacao em todo lugar que faltar tratar.
 */

export const PAPEIS = ["admin", "gestor", "suporte", "dev"] as const satisfies readonly Papel[];

export const CATEGORIAS_STATUS = [
  "aberto",
  "andamento",
  "concluido",
  "cancelado",
] as const satisfies readonly CategoriaStatus[];

export const PRIORIDADES = [
  "baixa",
  "media",
  "alta",
  "urgente",
] as const satisfies readonly Prioridade[];

export const SITUACOES_TICKET = [
  "aberto",
  "em_atendimento",
  "aguardando_cliente",
  "aguardando_dev",
  "resolvido",
  "cancelado",
] as const satisfies readonly SituacaoTicket[];

export const CANAIS_TICKET = [
  "manual",
  "telefone",
  "whatsapp",
  "email",
] as const satisfies readonly CanalTicket[];

export const TIPOS_BOARD = ["dev", "suporte"] as const satisfies readonly TipoBoard[];

export const EVENTOS_NOTIFICACAO = [
  "task_criada",
  "task_concluida",
  "task_atribuida",
  "ticket_aberto",
] as const satisfies readonly EventoNotificacao[];

export const DESTINOS_NOTIFICACAO = [
  "papel",
  "usuarios",
  "responsavel",
] as const satisfies readonly DestinoNotificacao[];

export const SITUACOES_OUTBOX = [
  "pendente",
  "enviado",
  "erro",
] as const satisfies readonly SituacaoOutbox[];

// ------------------------------------------------------------------
// Rotulos de tela. A UI nunca escreve o texto de um enum na mao.
// ------------------------------------------------------------------

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  suporte: "Suporte",
  dev: "Desenvolvimento",
};

export const ROTULO_CATEGORIA: Record<CategoriaStatus, string> = {
  aberto: "Aberto",
  andamento: "Em andamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const ROTULO_SITUACAO_TICKET: Record<SituacaoTicket, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_dev: "Aguardando desenvolvimento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const ROTULO_CANAL: Record<CanalTicket, string> = {
  manual: "Manual",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

export const ROTULO_EVENTO: Record<EventoNotificacao, string> = {
  task_criada: "Rotina criada",
  task_concluida: "Rotina concluida",
  task_atribuida: "Rotina atribuida",
  ticket_aberto: "Chamado aberto",
};

// ------------------------------------------------------------------
// Cores semanticas. Cor so aparece onde significa alguma coisa.
// Sao os valores gravados no banco (board_columns.cor, task_statuses.cor),
// por isso vivem aqui e nao no CSS.
// ------------------------------------------------------------------

export const COR_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "#8a9a8e",
  media: "#c99a3f",
  alta: "#d9752b",
  urgente: "#c0392b",
};

export const COR_CATEGORIA: Record<CategoriaStatus, string> = {
  aberto: "#8d8577",
  andamento: "#3f6ea8",
  concluido: "#4a7c59",
  cancelado: "#9b5b52",
};

export const COR_NEUTRA_COLUNA = "#8d8577";

// ------------------------------------------------------------------
// Rotas e permissoes
// ------------------------------------------------------------------

export const ROTAS = {
  login: "/login",
  kanban: "/kanban",
  atendimentos: "/atendimentos",
  dashboard: "/dashboard",
  config: "/config",
} as const;

/** Para onde cada papel cai depois do login. */
export const ROTA_INICIAL: Record<Papel, string> = {
  admin: ROTAS.dashboard,
  gestor: ROTAS.dashboard,
  suporte: ROTAS.atendimentos,
  dev: ROTAS.kanban,
};

/** Quem enxerga cada area. O middleware da etapa 2 le exatamente isto. */
export const PAPEIS_POR_ROTA: Record<string, readonly Papel[]> = {
  [ROTAS.kanban]: ["admin", "gestor", "suporte", "dev"],
  [ROTAS.atendimentos]: ["admin", "gestor", "suporte", "dev"],
  [ROTAS.dashboard]: ["admin", "gestor"],
  [ROTAS.config]: ["admin", "gestor"],
};

export function podeAcessar(papel: Papel, pathname: string): boolean {
  const rota = Object.keys(PAPEIS_POR_ROTA).find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!rota) return true;
  return PAPEIS_POR_ROTA[rota]!.includes(papel);
}

// ------------------------------------------------------------------
// Regras de negocio numericas
// ------------------------------------------------------------------

/** Card parado ha mais dias que isto ganha destaque de envelhecido no Kanban. */
export const DIAS_CARD_ENVELHECIDO = 14;

/** Worker de e-mail: quantidade por rodada e teto de tentativas antes de marcar erro. */
export const OUTBOX_LOTE = 20;
export const OUTBOX_MAX_TENTATIVAS = 5;
export const OUTBOX_INTERVALO_MS = 30_000;

export const SESSAO_DURACAO_DIAS = 7;
export const SESSAO_COOKIE = "crm_sessao";
