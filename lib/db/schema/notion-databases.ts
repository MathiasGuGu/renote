import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";

export const notionDatabases = pgTable("notion_databases", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  cover: jsonb("cover").$type<{
    type: "external" | "file";
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  }>(),
  icon: jsonb("icon").$type<{
    type: "emoji" | "external" | "file";
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  }>(),
  properties: jsonb("properties").notNull(),
  parent: jsonb("parent").$type<{
    type: "workspace" | "page_id" | "database_id" | "block_id";
    workspace?: boolean;
    page_id?: string;
    database_id?: string;
    block_id?: string;
  }>(),
  archived: text("archived").default("false"),
  inTrash: text("in_trash").default("false"),
  isInline: text("is_inline").default("false"),
  publicUrl: text("public_url"),
  pageCount: integer("page_count").default(0),
  lastEditedTime: timestamp("last_edited_time").notNull(),
  createdTime: timestamp("created_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
