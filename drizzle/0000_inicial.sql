CREATE TABLE `board_columns` (
	`id` char(36) NOT NULL,
	`board_id` char(36) NOT NULL,
	`nome` varchar(80) NOT NULL,
	`ordem` int NOT NULL,
	`cor` varchar(7) NOT NULL DEFAULT '#8d8577',
	`wip_limit` int,
	`is_done` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `board_columns_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_board_columns_ordem` UNIQUE(`board_id`,`ordem`)
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`id` char(36) NOT NULL,
	`nome` varchar(120) NOT NULL,
	`tipo` enum('dev','suporte') NOT NULL DEFAULT 'dev',
	`descricao` varchar(500),
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` char(36) NOT NULL,
	`razao_social` varchar(200) NOT NULL,
	`nome_fantasia` varchar(200),
	`cnpj` varchar(14),
	`telefone` varchar(32),
	`cidade` varchar(120),
	`uf` char(2),
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`rule_id` char(36),
	`evento` varchar(40) NOT NULL,
	`task_id` char(36),
	`ticket_id` bigint unsigned,
	`destinatarios` json NOT NULL,
	`assunto` varchar(200) NOT NULL,
	`corpo` text NOT NULL,
	`situacao` enum('pendente','enviado','erro') NOT NULL DEFAULT 'pendente',
	`tentativas` int NOT NULL DEFAULT 0,
	`ultimo_erro` varchar(500),
	`proxima_tentativa` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`enviado_em` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notification_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_rules` (
	`id` char(36) NOT NULL,
	`evento` enum('task_criada','task_concluida','task_atribuida','ticket_aberto') NOT NULL,
	`board_id` char(36),
	`destino_tipo` enum('papel','usuarios','responsavel') NOT NULL,
	`destino_papel` enum('admin','gestor','suporte','dev'),
	`destino_users` json,
	`assunto_tpl` varchar(200) NOT NULL,
	`corpo_tpl` text NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `notification_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` char(36) NOT NULL,
	`expira_em` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` char(36) NOT NULL,
	`task_id` char(36) NOT NULL,
	`user_id` char(36),
	`corpo` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `task_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`task_id` char(36) NOT NULL,
	`user_id` char(36),
	`campo` varchar(40) NOT NULL,
	`valor_antigo` varchar(255),
	`valor_novo` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `task_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_statuses` (
	`id` char(36) NOT NULL,
	`nome` varchar(80) NOT NULL,
	`categoria` enum('aberto','andamento','concluido','cancelado') NOT NULL,
	`cor` varchar(7) NOT NULL DEFAULT '#8d8577',
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `task_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_types` (
	`id` char(36) NOT NULL,
	`nome` varchar(80) NOT NULL,
	`icone` varchar(40),
	`cor` varchar(7) NOT NULL DEFAULT '#8d8577',
	`ativo` boolean NOT NULL DEFAULT true,
	CONSTRAINT `task_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` char(36) NOT NULL,
	`codigo` bigint unsigned AUTO_INCREMENT NOT NULL,
	`board_id` char(36) NOT NULL,
	`column_id` char(36) NOT NULL,
	`status_id` char(36) NOT NULL,
	`type_id` char(36),
	`titulo` varchar(200) NOT NULL,
	`descricao` text,
	`passos_repro` text,
	`versao_sistema` varchar(60),
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`assignee_id` char(36),
	`criado_por` char(36),
	`client_id` char(36),
	`ticket_id` bigint unsigned,
	`estimativa_h` decimal(6,2),
	`prazo` date,
	`rank` varchar(64) NOT NULL,
	`iniciado_em` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tasks_codigo` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` char(36) NOT NULL,
	`ticket_id` bigint unsigned NOT NULL,
	`user_id` char(36),
	`corpo` text NOT NULL,
	`interno` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`client_id` char(36),
	`solicitante` varchar(120),
	`canal` enum('manual','telefone','whatsapp','email') NOT NULL DEFAULT 'manual',
	`assunto` varchar(200) NOT NULL,
	`descricao` text,
	`situacao` enum('aberto','em_atendimento','aguardando_cliente','aguardando_dev','resolvido','cancelado') NOT NULL DEFAULT 'aberto',
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`atendente_id` char(36),
	`task_id` char(36),
	`aberto_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`fechado_em` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`username` varchar(64) NOT NULL,
	`nome` varchar(120) NOT NULL,
	`email` varchar(160),
	`senha_hash` varchar(255) NOT NULL,
	`papel` enum('admin','gestor','suporte','dev') NOT NULL DEFAULT 'suporte',
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users_username` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `board_columns` ADD CONSTRAINT `board_columns_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD CONSTRAINT `notification_outbox_rule_id_notification_rules_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `notification_rules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD CONSTRAINT `notification_outbox_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD CONSTRAINT `notification_outbox_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_rules` ADD CONSTRAINT `notification_rules_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_history` ADD CONSTRAINT `task_history_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_history` ADD CONSTRAINT `task_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_column_id_board_columns_id_fk` FOREIGN KEY (`column_id`) REFERENCES `board_columns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_status_id_task_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `task_statuses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_type_id_task_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `task_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_criado_por_users_id_fk` FOREIGN KEY (`criado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_atendente_id_users_id_fk` FOREIGN KEY (`atendente_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_clients_razao` ON `clients` (`razao_social`);--> statement-breakpoint
CREATE INDEX `idx_clients_cnpj` ON `clients` (`cnpj`);--> statement-breakpoint
CREATE INDEX `idx_outbox_pendente` ON `notification_outbox` (`situacao`,`proxima_tentativa`);--> statement-breakpoint
CREATE INDEX `idx_notification_rules_evento` ON `notification_rules` (`evento`,`ativo`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_task_comments_task` ON `task_comments` (`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_task_history_task` ON `task_history` (`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_coluna` ON `tasks` (`column_id`,`rank`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assignee` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_ticket` ON `tasks` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_board` ON `tasks` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_ticket_messages_ticket` ON `ticket_messages` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tickets_situacao` ON `tickets` (`situacao`);--> statement-breakpoint
CREATE INDEX `idx_tickets_client` ON `tickets` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_atendente` ON `tickets` (`atendente_id`);--> statement-breakpoint
CREATE INDEX `idx_users_papel` ON `users` (`papel`);