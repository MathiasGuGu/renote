CREATE TABLE "job_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"entity_id" text,
	"entity_type" text,
	"job_data" jsonb,
	"result" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"frequency" text NOT NULL,
	"cron_expression" text,
	"question_types" jsonb DEFAULT '["multiple_choice","short_answer"]'::jsonb,
	"difficulty" text DEFAULT 'medium',
	"question_count" integer DEFAULT 5,
	"focus_areas" jsonb,
	"last_run" timestamp,
	"next_run" timestamp,
	"run_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_history" ADD CONSTRAINT "job_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_schedules" ADD CONSTRAINT "question_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_schedules" ADD CONSTRAINT "question_schedules_page_id_notion_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."notion_pages"("id") ON DELETE cascade ON UPDATE no action;