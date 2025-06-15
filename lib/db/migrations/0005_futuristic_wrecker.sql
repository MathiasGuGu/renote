ALTER TABLE "notion_databases" ALTER COLUMN "title" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "description" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "parent" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "archived" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "is_inline" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "notion_databases" ALTER COLUMN "in_trash" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "notion_pages" ALTER COLUMN "title" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "notion_pages" ALTER COLUMN "parent" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notion_pages" ALTER COLUMN "archived" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "notion_pages" ALTER COLUMN "in_trash" SET DATA TYPE boolean;