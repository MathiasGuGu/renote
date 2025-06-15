import { pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";
import type { 
  Cover, 
  Icon, 
  Parent, 
  AnyPropertyValue,
  RichText, 
  NotionBlock
} from "@/lib/integrations/notion/types";

export const notionPages = pgTable("notion_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: jsonb("title").$type<RichText[]>().notNull().$defaultFn(() => []),
  url: text("url").notNull(),
  cover: jsonb("cover").$type<Cover | null>(),
  icon: jsonb("icon").$type<Icon | null>(),
  parent: jsonb("parent").$type<Parent>().notNull(),
  properties: jsonb("properties").$type<Record<string, AnyPropertyValue>>().notNull(),
  content: jsonb("content").$type<NotionBlock[]>(),
  archived: boolean("archived").default(false),
  public_url: text("public_url"),
  created_time: timestamp("created_time").notNull(),
  last_edited_time: timestamp("last_edited_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  in_trash: boolean("in_trash").default(false),
});
