# Prompt — CRM Suporte + Dev (Claude Code)

> Cole o conteúdo abaixo no Claude Code, dentro de uma pasta vazia.
> Se você já tem os arquivos `crm_schema_fase1.sql` e `crm_migration_notificacoes.sql`,
> coloque-os na raiz antes e acrescente: "use os .sql da raiz como fonte da verdade do schema".

---

Você vai construir um CRM interno de Suporte + Desenvolvimento, do zero, em Next.js.
Uso interno de uma software house (equipe de ~10 pessoas). Não é SaaS multi-tenant.

O sistema é **autocontido**: cadastro próprio de clientes e usuários, sem integração com
ERP, telefonia ou qualquer sistema externo. Não crie camada de sync, adapter, fila de
importação nem campo de "código no sistema de origem".

## Regra de ouro

Antes de escrever qualquer tela, crie a **camada de domínio compartilhada** em `src/domain/`.
Nenhum componente, rota ou query pode declarar tipo próprio de entidade nem string solta de
status. Tudo importa de `src/domain`. Se precisar de um campo que não existe lá, primeiro
altere o domínio, depois use.

---

## 1. Stack

- Next.js 15 (App Router) + TypeScript strict
- PostgreSQL, acesso via `pg` puro ou Drizzle (escolha Drizzle se for gerar migrations)
- Auth própria com cookie de sessão `httpOnly` + `sameSite=lax`, senha em **argon2id**
- Tailwind para layout, CSS Modules ou `<style>` para o que for identidade visual
- Zod para validar toda entrada de rota
- Sem ORM pesado, sem GraphQL, sem state manager global (React state + Server Components bastam)

---

## 2. Estrutura de pastas

```
src/
  domain/
    types.ts        # todas as entidades e enums do sistema
    constants.ts    # categorias, prioridades, papeis, rotas por papel
    schemas.ts      # zod de cada payload de entrada
    index.ts        # re-export
  db/
    client.ts
    queries/        # tickets.ts, tasks.ts, boards.ts, users.ts, notifications.ts
  services/         # regras de negocio: escalar.ts, mover-task.ts, outbox.ts
  app/
    (auth)/login/
    (app)/kanban/
    (app)/atendimentos/
    (app)/config/       # colunas, status, tipos, regras de notificacao
    api/
  components/
    ui/               # primitivos: Botao, Campo, Modal, Selo, Avatar
    kanban/
    tickets/
  lib/                # rank.ts (LexoRank), auth.ts, mailer.ts, datas.ts
```

Queries nunca dentro de componente. Componente chama service, service chama query.

---

## 3. Estrutura de dados global (`src/domain/types.ts`)

Implemente exatamente isto, e derive o SQL a partir daqui:

```ts
export type Papel = "admin" | "gestor" | "suporte" | "dev";
export type CategoriaStatus = "aberto" | "andamento" | "concluido" | "cancelado";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";
export type SituacaoTicket =
  | "aberto" | "em_atendimento" | "aguardando_cliente"
  | "aguardando_dev" | "resolvido" | "cancelado";
export type CanalTicket = "manual" | "telefone" | "whatsapp" | "email";

export interface Usuario {
  id: string;
  username: string;        // login e por username, NAO por e-mail
  nome: string;
  email: string | null;    // opcional, usado so para notificacao
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
  tipo: "dev" | "suporte";
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
  isDone: boolean;         // ao entrar aqui, o ticket de origem e devolvido ao suporte
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
  id: number;              // e o numero do protocolo, sequencial
  clientId: string | null;
  solicitante: string | null;
  canal: CanalTicket;
  assunto: string;
  descricao: string | null;
  situacao: SituacaoTicket;
  prioridade: Prioridade;
  atendenteId: string | null;
  taskId: string | null;   // vinculo com a rotina de dev
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
  codigo: number;          // DEV-123
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
  rank: string;            // LexoRank — ordem dentro da coluna
  iniciadoEm: string | null;  // preenchido ao entrar na 1a etapa de andamento
  createdAt: string;
  updatedAt: string;
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
  evento: "task_criada" | "task_concluida" | "task_atribuida" | "ticket_aberto";
  boardId: string | null;
  destinoTipo: "papel" | "usuarios" | "responsavel";
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
  situacao: "pendente" | "enviado" | "erro";
  tentativas: number;
  ultimoErro: string | null;
  proximaTentativa: string;
  enviadoEm: string | null;
}

/** Modelo achatado que o Kanban consome — evita N+1 no client. */
export interface TaskCard {
  id: string;
  codigo: number;
  solicitacao: number | null;   // ticketId
  assunto: string;              // titulo
  cliente: string | null;       // razaoSocial
  responsavel: { id: string; nome: string } | null;
  status: { nome: string; cor: string; categoria: CategoriaStatus };
  inicio: string | null;        // iniciadoEm
  prioridade: Prioridade;
  columnId: string;
  rank: string;
}
```

Toda query de leitura do Kanban devolve `TaskCard[]`, nunca `Task[]` cru.

---

## 4. Regras de negócio (implemente como serviços testáveis)

**4.1 Escalar chamado para o dev** — `services/escalar.ts`

Tudo em UMA transação:
1. `SELECT ... FOR UPDATE` no ticket. Se `taskId` já existe, erro "já está com o desenvolvimento".
2. Cria a `task` na primeira coluna do board (menor `ordem`) com o status de categoria `aberto`.
3. `ticket.situacao = 'aguardando_dev'` e `ticket.taskId = task.id`. O ticket **não fecha**.
4. Grava `task_history` com a origem.
5. Resolve as `notification_rules` do evento `task_criada` e insere em `notification_outbox`
   **dentro da mesma transação**. Nunca envie e-mail dentro do request.

**4.2 Worker de e-mail** — `services/outbox.ts`

Roda a cada 30s. `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 20`, envia em **BCC**, marca
`enviado`. Em falha: backoff exponencial (2^n minutos), desiste em 5 tentativas e marca `erro`.
Destinatários resolvidos filtrando `email IS NOT NULL AND ativo`.

**4.3 Mover card** — `services/mover-task.ts`

1. Recalcula `rank` (LexoRank entre o card anterior e o próximo — 1 UPDATE, nunca reordenar a coluna).
2. Se a coluna de destino for de andamento e `iniciadoEm` for null, preenche com `now()`.
3. Se `column.isDone`, muda status para categoria `concluido` e devolve o ticket vinculado
   para `em_atendimento`, notificando o atendente.
4. Sempre grava `task_history`.

**4.4 Configuração**

Colunas, status, tipos e regras de notificação são CRUD normal em `/config`, só para
`admin` e `gestor`. Renomear coluna ou status **nunca** pode quebrar relatório — por isso a
`categoria` existe e é imutável na tela comum.

**4.5 Auth**

Login por `username` (citext, case-insensitive). Erro sempre genérico: "usuário ou senha
inválidos". Middleware protege as rotas por papel. Redirect pós-login:
`dev → /kanban`, `suporte → /atendimentos`, `gestor|admin → /dashboard`.

---

## 5. Telas

1. **Login** — username, senha, nada mais.
2. **Kanban** (`/kanban`) — colunas com nome editável inline, drag & drop.
   Card mostra, nesta ordem: **Solicitação, Assunto, Cliente, Responsável, Status, Início**.
   Início mostra data e dias corridos; passou de 14 dias, destaca. Barra lateral colorida = prioridade.
   Card sem responsável tem avatar tracejado. Filtro "Minhas / Todas" no topo.
3. **Detalhe do card** — descrição, passos pra reproduzir, versão, comentários, histórico,
   link pro chamado de origem.
4. **Atendimentos** (`/atendimentos`) — lista com filtro por situação, form de abertura manual,
   timeline de mensagens, botão **"Enviar para desenvolvimento"** que abre modal
   (tipo, prioridade, versão, passos pra reproduzir).
5. **Config** (`/config`) — colunas, status, tipos, usuários, regras de notificação.

---

## 6. Direção de design

Não quero cara de template. Quero uma ferramenta interna que dá gosto de usar o dia inteiro.

- **Tipografia:** fonte com personalidade, não Inter nem Roboto nem system-ui. Uma sans de
  texto e uma **mono para todo número** — protocolo, código, datas, contadores. É o que dá
  o ar de ferramenta de engenharia.
- **Paleta:** claro, base de papel quente (não branco puro, não cinza azulado). Um tom de tinta
  escuro para texto. Cor usada com parcimônia e só onde significa algo: prioridade, categoria
  de status, alerta de card envelhecido. **Proibido gradiente roxo, glassmorphism e emoji como ícone.**
- **Densidade:** é tela de trabalho. Prefira informação a espaço vazio, mas com hierarquia
  clara — o assunto é o que se lê primeiro, o resto é contexto.
- **Bordas e sombras:** discretas. 2-3px de raio, sombra só no hover e no que está sendo arrastado.
- **Movimento:** transições de 120-160ms em hover e drag. Nada de animação de entrada
  em lista, incomoda quem usa o dia inteiro.
- Estados vazios e de erro escritos como frase de gente, não "No data available".

Componentes visuais em `components/ui/` primeiro. Sem shadcn, sem Material — quero
identidade própria.

---

## 7. Ordem de execução

Faça um commit por etapa e **pare para eu revisar ao fim de cada uma**:

1. Setup, `src/domain` completo, migrations e seed (5 colunas, 6 status, 4 tipos, 1 admin)
2. Auth + middleware por papel + redirect
3. `/config` de colunas e status
4. Kanban com drag & drop persistindo `rank`, `iniciadoEm` e `task_history`
5. Detalhe do card + comentários
6. `/atendimentos` + modal de escalação (transação completa)
7. Outbox + worker de e-mail + tela de notificações com falha
8. Dashboard: lead time por coluna, backlog por cliente, chamados aguardando dev

---

## 8. Não faça

- Não crie tipo de entidade fora de `src/domain`
- Não chumbe nome de coluna ou status no código — leia do banco
- Não envie e-mail dentro do request HTTP
- Não use `any`
- Não instale biblioteca de UI pronta nem de drag & drop pesada (HTML5 DnD nativo resolve)
- Não gere dados de exemplo além do seed que eu pedi
- Não escreva comentário óbvio; comente só a decisão que não é evidente pelo código

---

## 9. Comece por

Perguntando o que ainda está ambíguo. Depois entregue a etapa 1 e pare.
