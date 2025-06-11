CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "notion_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_name" text NOT NULL,
	"workspace_id" text NOT NULL,
	"workspace_icon" text,
	"access_token" text NOT NULL,
	"bot_id" text NOT NULL,
	"owner" jsonb,
	"duplicated_template_id" text,
	"request_id" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sync" timestamp,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notion_databases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"notion_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"cover" jsonb,
	"icon" jsonb,
	"properties" jsonb NOT NULL,
	"parent" jsonb,
	"archived" text DEFAULT 'false',
	"in_trash" text DEFAULT 'false',
	"is_inline" text DEFAULT 'false',
	"public_url" text,
	"page_count" integer DEFAULT 0,
	"last_edited_time" timestamp NOT NULL,
	"created_time" timestamp NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notion_databases_notion_id_unique" UNIQUE("notion_id")
);
--> statement-breakpoint
CREATE TABLE "notion_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"notion_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"cover" jsonb,
	"icon" jsonb,
	"parent" jsonb,
	"properties" jsonb,
	"content" jsonb,
	"archived" text DEFAULT 'false',
	"in_trash" text DEFAULT 'false',
	"public_url" text,
	"last_edited_time" timestamp NOT NULL,
	"created_time" timestamp NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notion_pages_notion_id_unique" UNIQUE("notion_id")
);
--> statement-breakpoint
ALTER TABLE "notion_accounts" ADD CONSTRAINT "notion_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notion_databases" ADD CONSTRAINT "notion_databases_account_id_notion_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."notion_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notion_pages" ADD CONSTRAINT "notion_pages_account_id_notion_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."notion_accounts"("id") ON DELETE cascade ON UPDATE no action;