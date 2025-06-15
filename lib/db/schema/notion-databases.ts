import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";
import type {
  RichText,
  Icon,
  Cover,
  Parent,
  AnyPropertyValue,
} from "@/lib/integrations/notion/types";

export const notionDatabases = pgTable("notion_databases", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: jsonb("title").$type<RichText[]>().notNull(),
  description: jsonb("description").$type<RichText[]>(),
  url: text("url").notNull(),
  cover: jsonb("cover").$type<Cover | null>(),
  icon: jsonb("icon").$type<Icon | null>(),
  properties: jsonb("properties").$type<Record<string, AnyPropertyValue>>().notNull(),
  parent: jsonb("parent").$type<Parent>().notNull(),
  archived: boolean("archived").default(false),
  is_inline: boolean("is_inline").default(false),
  public_url: text("public_url"),
  pageCount: integer("page_count").default(0),
  created_time: timestamp("created_time").notNull(),
  last_edited_time: timestamp("last_edited_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  in_trash: boolean("in_trash").default(false),
});
