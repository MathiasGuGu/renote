ALTER TABLE "notion_pages" ALTER COLUMN "archived" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notion_pages" ALTER COLUMN "archived" SET DEFAULT 'false';--> statement-breakpoint
ALTER TABLE "notion_databases" ADD COLUMN "in_trash" text DEFAULT 'false';--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "in_trash" text DEFAULT 'false';--> statement-breakpoint
ALTER TABLE "notion_databases" DROP COLUMN "object";--> statement-breakpoint
ALTER TABLE "notion_pages" DROP COLUMN "object";