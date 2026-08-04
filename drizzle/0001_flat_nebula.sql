CREATE TABLE `labels` (
	`id` char(36) NOT NULL,
	`nome` varchar(60) NOT NULL,
	`cor` varchar(7) NOT NULL DEFAULT '#8d8577',
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_labels_nome` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `task_labels` (
	`task_id` char(36) NOT NULL,
	`label_id` char(36) NOT NULL,
	CONSTRAINT `task_labels_task_id_label_id_pk` PRIMARY KEY(`task_id`,`label_id`)
);
--> statement-breakpoint
ALTER TABLE `task_labels` ADD CONSTRAINT `task_labels_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_labels` ADD CONSTRAINT `task_labels_label_id_labels_id_fk` FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_task_labels_label` ON `task_labels` (`label_id`);