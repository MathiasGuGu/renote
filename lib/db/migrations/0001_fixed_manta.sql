CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notion_page_id" uuid NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"options" jsonb,
	"difficulty" text DEFAULT 'medium',
	"tags" jsonb,
	"ai_model" text,
	"ai_prompt" text,
	"confidence" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_notion_page_id_notion_pages_id_fk" FOREIGN KEY ("notion_page_id") REFERENCES "public"."notion_pages"("id") ON DELETE cascade ON UPDATE no action;