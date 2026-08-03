/**
 * Fonte da verdade de todas as entidades do sistema.
 * Nenhum componente, rota, service ou query declara tipo proprio de entidade.
 * Precisa de um campo novo? Altere aqui primeiro, depois use.
 */

export type Papel = "admin" | "gestor" | "suporte" | "dev";
export type CategoriaStatus = "aberto" | "andamento" | "concluido" | "cancelado";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";
export type SituacaoTicket =
  | "aberto"
  | "em_atendimento"
  | "aguardando_cliente"
  | "aguardando_dev"
  | "resolvido"
  | "cancelado";
export type CanalTicket = "manual" | "telefone" | "whatsapp" | "email";
export type TipoBoard = "dev" | "suporte";

export type EventoNotificacao =
  | "task_criada"
  | "task_concluida"
  | "task_atribuida"
  | "ticket_aberto";
export type DestinoNotificacao = "papel" | "usuarios" | "responsavel";
export type SituacaoOutbox = "pendente" | "enviado" | "erro";

export interface Usuario {
  id: string;
  username: string; // login e por username, NAO por e-mail
  nome: string;
  email: string | null; // opcional, usado so para notificacao
  papel: Papel;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
}

export interface Board {
  id: string;
  nome: string;
  tipo: TipoBoard;
  descricao: string | null;
  ativo: boolean;
}

/** As etapas do processo. Nome e ordem sao editaveis pelo usuario. */
export interface BoardColumn {
  id: string;
  boardId: string;
  nome: string;
  ordem: number;
  cor: string;
  wipLimit: number | null;
  isDone: boolean; // ao entrar aqui, o ticket de origem e devolvido ao suporte
}

/** O NOME e livre. A CATEGORIA e fixa e e o que relatorio/automacao le. */
export interface TaskStatus {
  id: string;
  nome: string;
  categoria: CategoriaStatus;
  cor: string;
  ordem: number;
  ativo: boolean;
}

export interface TaskType {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

export interface Ticket {
  id: number; // e o numero do protocolo, sequencial
  clientId: string | null;
  solicitante: string | null;
  canal: CanalTicket;
  assunto: string;
  descricao: string | null;
  situacao: SituacaoTicket;
  prioridade: Prioridade;
  atendenteId: string | null;
  taskId: string | null; // vinculo com a rotina de dev
  abertoEm: string;
  fechadoEm: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: number;
  userId: string | null;
  corpo: string;
  interno: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  codigo: number; // DEV-123
  boardId: string;
  columnId: string;
  statusId: string;
  typeId: string | null;
  titulo: string;
  descricao: string | null;
  passosRepro: string | null;
  versaoSistema: string | null;
  prioridade: Prioridade;
  assigneeId: string | null;
  criadoPor: string | null;
  clientId: string | null;
  ticketId: number | null;
  estimativaH: number | null;
  prazo: string | null;
  rank: string; // LexoRank - ordem dentro da coluna
  iniciadoEm: string | null; // preenchido ao entrar na 1a etapa de andamento
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string | null;
  corpo: string;
  createdAt: string;
}

export interface TaskHistory {
  id: number;
  taskId: string;
  userId: string | null;
  campo: string;
  valorAntigo: string | null;
  valorNovo: string | null;
  createdAt: string;
}

export interface NotificationRule {
  id: string;
  evento: EventoNotificacao;
  boardId: string | null;
  destinoTipo: DestinoNotificacao;
  destinoPapel: Papel | null;
  destinoUsers: string[] | null;
  assuntoTpl: string;
  corpoTpl: string;
  ativo: boolean;
}

export interface NotificationOutbox {
  id: number;
  ruleId: string | null;
  evento: string;
  taskId: string | null;
  ticketId: number | null;
  destinatarios: string[];
  assunto: string;
  corpo: string;
  situacao: SituacaoOutbox;
  tentativas: number;
  ultimoErro: string | null;
  proximaTentativa: string;
  enviadoEm: string | null;
}

/** Modelo achatado que o Kanban consome - evita N+1 no client. */
export interface TaskCard {
  id: string;
  codigo: number;
  solicitacao: number | null; // ticketId
  assunto: string; // titulo
  cliente: string | null; // razaoSocial
  responsavel: { id: string; nome: string } | null;
  status: { nome: string; cor: string; categoria: CategoriaStatus };
  inicio: string | null; // iniciadoEm
  prioridade: Prioridade;
  columnId: string;
  rank: string;
}

/** Usuario ja autenticado, o que a sessao carrega. Nunca inclui senha_hash. */
export type UsuarioSessao = Pick<Usuario, "id" | "username" | "nome" | "papel">;
