import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notionAccounts = pgTable("notion_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceName: text("workspace_name").notNull(),
  workspaceId: text("workspace_id").notNull(),
  workspaceIcon: text("workspace_icon"),
  accessToken: text("access_token").notNull(),
  botId: text("bot_id").notNull(),
  owner: jsonb("owner").$type<{
    type: "user" | "workspace";
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
      type: string;
      person?: {
        email: string;
      };
    };
  }>(),
  duplicatedTemplateId: text("duplicated_template_id"),
  requestId: text("request_id"),
  status: text("status", { enum: ["connected", "disconnected", "error"] })
    .notNull()
    .default("connected"),
  lastSync: timestamp("last_sync"),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
