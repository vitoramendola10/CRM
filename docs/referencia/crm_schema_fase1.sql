-- =============================================================
-- CRM Dev + Suporte  |  Fase 1  |  PostgreSQL
-- Escopo: atendimento manual pelo suporte -> avaliacao -> tarefa no board de dev
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- -------------------------------------------------------------
-- updated_at automatico
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- 1. USUARIOS E CLIENTES
-- =============================================================

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  email         citext UNIQUE NOT NULL,
  senha_hash    text NOT NULL,
  papel         text NOT NULL DEFAULT 'suporte'
                CHECK (papel IN ('admin','suporte','dev','gestor')),
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Cadastro proprio do CRM. Sem vinculo com sistema externo.
CREATE TABLE clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social  text NOT NULL,
  nome_fantasia text,
  cnpj          text,
  telefone      text,          -- E.164 quando o VIP entrar
  email         text,
  cidade        text,
  uf            char(2),
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_razao ON clients (lower(razao_social));
CREATE INDEX idx_clients_cnpj  ON clients (cnpj);


-- =============================================================
-- 2. CONFIGURACAO DO KANBAN  (tudo editavel pelo usuario)
-- =============================================================

CREATE TABLE boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  tipo        text NOT NULL DEFAULT 'dev' CHECK (tipo IN ('dev','suporte')),
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- As "etapas do processo". Nome e ordem sao livres.
-- is_done marca a coluna que dispara o retorno para o suporte.
CREATE TABLE board_columns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  ordem       int  NOT NULL,
  cor         text DEFAULT '#94a3b8',
  wip_limit   int,
  is_done     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, ordem) DEFERRABLE INITIALLY DEFERRED
);

-- Status da tarefa. O NOME o usuario muda a vontade.
-- A CATEGORIA e fixa e e o que relatorio/automacao le.
CREATE TABLE task_statuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  categoria   text NOT NULL
              CHECK (categoria IN ('aberto','andamento','concluido','cancelado')),
  cor         text DEFAULT '#94a3b8',
  ordem       int  NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  icone       text,
  cor         text DEFAULT '#94a3b8',
  ativo       boolean NOT NULL DEFAULT true
);


-- =============================================================
-- 3. SUPORTE  (atendimento preenchido na mao)
-- =============================================================

CREATE TABLE tickets (
  id             bigserial PRIMARY KEY,          -- numero do protocolo
  client_id      uuid REFERENCES clients(id),
  solicitante    text,                           -- quem ligou / falou
  canal          text NOT NULL DEFAULT 'manual'
                 CHECK (canal IN ('manual','telefone','whatsapp','email')),
  assunto        text NOT NULL,
  descricao      text,
  situacao       text NOT NULL DEFAULT 'aberto'
                 CHECK (situacao IN ('aberto','em_atendimento','aguardando_cliente',
                                     'aguardando_dev','resolvido','cancelado')),
  prioridade     text NOT NULL DEFAULT 'media'
                 CHECK (prioridade IN ('baixa','media','alta','urgente')),
  atendente_id   uuid REFERENCES users(id),
  task_id        uuid,                            -- FK adicionada mais abaixo
  aberto_em      timestamptz NOT NULL DEFAULT now(),
  fechado_em     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_situacao  ON tickets (situacao);
CREATE INDEX idx_tickets_client    ON tickets (client_id);
CREATE INDEX idx_tickets_atendente ON tickets (atendente_id);

-- Timeline do atendimento. interno = nao mostra pro cliente no futuro portal.
CREATE TABLE ticket_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   bigint NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id),
  corpo       text NOT NULL,
  interno     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages (ticket_id, created_at);


-- =============================================================
-- 4. DEV  (a rotina que o suporte gera)
-- =============================================================

CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        bigserial,                       -- DEV-1, DEV-2...
  board_id      uuid NOT NULL REFERENCES boards(id),
  column_id     uuid NOT NULL REFERENCES board_columns(id),
  status_id     uuid NOT NULL REFERENCES task_statuses(id),
  type_id       uuid REFERENCES task_types(id),
  titulo        text NOT NULL,
  descricao     text,
  passos_repro  text,                            -- como reproduzir
  versao_sistema text,
  prioridade    text NOT NULL DEFAULT 'media'
                CHECK (prioridade IN ('baixa','media','alta','urgente')),
  assignee_id   uuid REFERENCES users(id),
  criado_por    uuid REFERENCES users(id),
  client_id     uuid REFERENCES clients(id),     -- de qual cliente nasceu
  ticket_id     bigint REFERENCES tickets(id),   -- volta pro suporte
  estimativa_h  numeric(6,2),
  prazo         date,
  rank          text NOT NULL,                   -- LexoRank: ordem dentro da coluna
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_task FOREIGN KEY (task_id) REFERENCES tasks(id);

CREATE INDEX idx_tasks_coluna   ON tasks (column_id, rank);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX idx_tasks_ticket   ON tasks (ticket_id);

CREATE TABLE task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id),
  corpo       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- De onde saem lead time, cycle time e o "quem mexeu nisso".
CREATE TABLE task_history (
  id            bigserial PRIMARY KEY,
  task_id       uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id),
  campo         text NOT NULL,       -- 'column_id', 'status_id', 'assignee_id'...
  valor_antigo  text,
  valor_novo    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_history_task ON task_history (task_id, created_at);


-- =============================================================
-- 5. TRIGGERS updated_at
-- =============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','clients','boards','board_columns',
                           'task_statuses','tickets','tasks']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;


-- =============================================================
-- 6. SEED
-- =============================================================

INSERT INTO task_statuses (nome, categoria, ordem, cor) VALUES
  ('Aguardando',   'aberto',     1, '#94a3b8'),
  ('Em analise',   'andamento',  2, '#f59e0b'),
  ('Em desenvolvimento','andamento', 3, '#3b82f6'),
  ('Em teste',     'andamento',  4, '#8b5cf6'),
  ('Concluido',    'concluido',  5, '#22c55e'),
  ('Cancelado',    'cancelado',  6, '#ef4444');

INSERT INTO task_types (nome, cor) VALUES
  ('Bug', '#ef4444'), ('Melhoria', '#3b82f6'),
  ('Nova rotina', '#22c55e'), ('Ajuste fiscal', '#f59e0b');

INSERT INTO boards (id, nome, tipo)
VALUES ('11111111-1111-1111-1111-111111111111', 'Desenvolvimento', 'dev');

INSERT INTO board_columns (board_id, nome, ordem, is_done) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Backlog',            1, false),
  ('11111111-1111-1111-1111-111111111111', 'Em analise',         2, false),
  ('11111111-1111-1111-1111-111111111111', 'Desenvolvimento',    3, false),
  ('11111111-1111-1111-1111-111111111111', 'Homologacao',        4, false),
  ('11111111-1111-1111-1111-111111111111', 'Pronto para entrega',5, true);
