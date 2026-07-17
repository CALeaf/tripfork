CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`destination` text NOT NULL,
	`summary` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trips_owner_updated_idx` ON `trips` (`owner_id`,`updated_at`);