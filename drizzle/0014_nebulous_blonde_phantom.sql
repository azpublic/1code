CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`category` text,
	`created_at` integer,
	`updated_at` integer,
	`last_used_at` integer,
	`usage_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prompt_templates_category_idx` ON `prompt_templates` (`category`);--> statement-breakpoint
CREATE INDEX `prompt_templates_last_used_idx` ON `prompt_templates` (`last_used_at`);