ALTER TABLE "notion_databases" ALTER COLUMN "archived" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "archived" SET DEFAULT 'false';--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "is_inline" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "is_inline" SET DEFAULT 'false';