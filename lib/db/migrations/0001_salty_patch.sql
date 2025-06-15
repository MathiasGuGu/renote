-- Convert title and description to jsonb with direct casting
ALTER TABLE "notion_databases"
  ALTER COLUMN "title" TYPE jsonb USING to_jsonb("title");

ALTER TABLE "notion_databases"
  ALTER COLUMN "description" TYPE jsonb USING to_jsonb("description");

-- Convert boolean fields
ALTER TABLE "notion_databases"
  ALTER COLUMN "archived" TYPE boolean USING "archived"::boolean;

ALTER TABLE "notion_databases"
  ALTER COLUMN "is_inline" TYPE boolean USING "is_inline"::boolean;

ALTER TABLE "notion_pages"
  ALTER COLUMN "archived" TYPE boolean USING "archived"::boolean;

-- Add object column
ALTER TABLE "notion_databases" ADD COLUMN "object" text DEFAULT 'database' NOT NULL;
ALTER TABLE "notion_pages" ADD COLUMN "object" text DEFAULT 'page' NOT NULL;

-- Drop in_trash columns
ALTER TABLE "notion_databases" DROP COLUMN "in_trash";
ALTER TABLE "notion_pages" DROP COLUMN "in_trash";
