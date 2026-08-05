CREATE TABLE `canned_replies` (
	`id` char(36) NOT NULL,
	`nome` varchar(80) NOT NULL,
	`corpo` text NOT NULL,
	`situacao` enum('aberto','em_atendimento','aguardando_cliente','aguardando_dev','resolvido','cancelado'),
	`interno` boolean NOT NULL DEFAULT true,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `canned_replies_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_canned_replies_nome` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `task_links` (
	`task_id` char(36) NOT NULL,
	`depende_de_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `task_links_task_id_depende_de_id_pk` PRIMARY KEY(`task_id`,`depende_de_id`),
	CONSTRAINT `ck_task_links_self` CHECK(`task_links`.`task_id` <> `task_links`.`depende_de_id`)
);
--> statement-breakpoint
CREATE TABLE `task_worklog` (
	`id` char(36) NOT NULL,
	`task_id` char(36) NOT NULL,
	`user_id` char(36),
	`minutos` int NOT NULL,
	`data` date NOT NULL,
	`nota` varchar(200),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `task_worklog_id` PRIMARY KEY(`id`),
	CONSTRAINT `ck_task_worklog_minutos` CHECK(`task_worklog`.`minutos` > 0 and `task_worklog`.`minutos` <= 1440)
);
--> statement-breakpoint
ALTER TABLE `task_links` ADD CONSTRAINT `task_links_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_links` ADD CONSTRAINT `task_links_depende_de_id_tasks_id_fk` FOREIGN KEY (`depende_de_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_worklog` ADD CONSTRAINT `task_worklog_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_worklog` ADD CONSTRAINT `task_worklog_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_task_links_depende` ON `task_links` (`depende_de_id`);--> statement-breakpoint
CREATE INDEX `idx_task_worklog_task` ON `task_worklog` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_task_worklog_data` ON `task_worklog` (`data`);