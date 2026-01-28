ALTER TABLE `tasks` ADD `chat_id` text REFERENCES chats(id);--> statement-breakpoint
CREATE INDEX `tasks_chat_id_idx` ON `tasks` (`chat_id`);