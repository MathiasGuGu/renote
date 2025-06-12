ALTER TABLE "notion_pages" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "properties_hash" text;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "title_hash" text;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "last_processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "last_processed_hash" text;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "processing_version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "change_detected_at" timestamp;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD COLUMN "requires_processing" text DEFAULT 'false';--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "source_content_hash" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "source_version" integer;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "last_validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "is_stale" text DEFAULT 'false';