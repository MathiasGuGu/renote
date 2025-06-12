import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { notionAccounts } from "./notion-accounts";

export const notionPages = pgTable("notion_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => notionAccounts.id, { onDelete: "cascade" }),
  notionId: text("notion_id").notNull().unique(),
  title: text("title").notNull(),
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
  parent: jsonb("parent").$type<{
    type: "workspace" | "page_id" | "database_id" | "block_id";
    workspace?: boolean;
    page_id?: string;
    database_id?: string;
    block_id?: string;
  }>(),
  properties: jsonb("properties"),
  content: jsonb("content"), // Store the page blocks/content
  archived: text("archived").default("false"),
  inTrash: text("in_trash").default("false"),
  publicUrl: text("public_url"),
  lastEditedTime: timestamp("last_edited_time").notNull(),
  createdTime: timestamp("created_time").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Phase 3: Change Detection & Incremental Processing
  contentHash: text("content_hash"), // MD5/SHA hash of content for change detection
  propertiesHash: text("properties_hash"), // Hash of properties for change detection
  titleHash: text("title_hash"), // Hash of title for change detection
  lastProcessedAt: timestamp("last_processed_at"), // When content was last processed for questions
  lastProcessedHash: text("last_processed_hash"), // Hash of content when last processed
  processingVersion: integer("processing_version").default(1), // Version tracking for incremental updates
  changeDetectedAt: timestamp("change_detected_at"), // When a change was first detected
  requiresProcessing: text("requires_processing").default("false"), // Flag for pending processing
});
