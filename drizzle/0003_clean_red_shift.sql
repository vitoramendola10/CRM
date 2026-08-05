CREATE TABLE `attachments` (
	`id` char(36) NOT NULL,
	`ticket_id` bigint unsigned,
	`task_id` char(36),
	`nome_original` varchar(255) NOT NULL,
	`tipo_mime` varchar(120) NOT NULL,
	`tamanho_bytes` bigint unsigned NOT NULL,
	`caminho` varchar(200) NOT NULL,
	`enviado_por` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_attachments_caminho` UNIQUE(`caminho`),
	CONSTRAINT `ck_attachments_dono` CHECK((`attachments`.`ticket_id` is not null and `attachments`.`task_id` is null) or (`attachments`.`ticket_id` is null and `attachments`.`task_id` is not null))
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_enviado_por_users_id_fk` FOREIGN KEY (`enviado_por`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_attachments_ticket` ON `attachments` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `idx_attachments_task` ON `attachments` (`task_id`);