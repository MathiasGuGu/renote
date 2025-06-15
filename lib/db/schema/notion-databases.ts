import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";
import type {
  NotionRichText,
  NotionIcon,
  NotionCover,
  NotionParent,
} from "@/lib/integrations/notion/types";

export const notionDatabases = pgTable("notion_databases", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  cover: jsonb("cover").$type<NotionCover | null>(),
  icon: jsonb("icon").$type<NotionIcon | null>(),
  properties: jsonb("properties").notNull(),
  parent: jsonb("parent").$type<NotionParent>(),
  archived: text("archived").default("false"),
  is_inline: text("is_inline").default("false"),
  public_url: text("public_url"),
  pageCount: integer("page_count").default(0),
  created_time: timestamp("created_time").notNull(),
  last_edited_time: timestamp("last_edited_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  in_trash: text("in_trash").default("false"),
});
