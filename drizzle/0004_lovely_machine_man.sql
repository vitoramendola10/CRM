CREATE TABLE `ticket_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ticket_id` bigint unsigned NOT NULL,
	`user_id` char(36),
	`campo` varchar(40) NOT NULL,
	`valor_antigo` varchar(255),
	`valor_novo` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `ticket_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ticket_history` ADD CONSTRAINT `ticket_history_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_history` ADD CONSTRAINT `ticket_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_ticket_history_ticket` ON `ticket_history` (`ticket_id`,`created_at`);