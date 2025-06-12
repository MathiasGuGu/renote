ALTER TABLE "job_history" ADD COLUMN "priority" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_history" ADD COLUMN "trigger_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "job_history" ADD COLUMN "max_retries" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "job_history" ADD COLUMN "next_retry_at" timestamp;