import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";
import type {
  NotionIcon,
  NotionCover,
  NotionParent,
} from "@/lib/integrations/notion/types";

export const notionPages = pgTable("notion_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  cover: jsonb("cover").$type<NotionCover | null>(),
  icon: jsonb("icon").$type<NotionIcon | null>(),
  parent: jsonb("parent").$type<NotionParent>(),
  properties: jsonb("properties").notNull(),
  content: jsonb("content"),
  archived: text("archived").default("false"),
  public_url: text("public_url"),
  created_time: timestamp("created_time").notNull(),
  last_edited_time: timestamp("last_edited_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  in_trash: text("in_trash").default("false"),
});
