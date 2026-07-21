CREATE TABLE `guides` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`destination` text NOT NULL,
	`author` text NOT NULL,
	`summary` text NOT NULL,
	`data_json` text NOT NULL,
	`published_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guides_published_idx` ON `guides` (`published_at`);