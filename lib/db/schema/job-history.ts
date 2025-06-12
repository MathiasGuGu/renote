import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { notionPages } from "./notion-pages";

export const jobHistory = pgTable("job_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull(), // pg-boss job ID
  jobType: text("job_type").notNull(), // "generate-questions", "sync-notion-account", etc.
  status: text("status").notNull(), // "created", "active", "completed", "failed", "cancelled"
  priority: integer("priority").default(5).notNull(), // 1=highest, 10=lowest
  triggerType: text("trigger_type").notNull(), // 'user', 'scheduled', 'bulk'
  entityId: text("entity_id"), // pageId, accountId, etc.
  entityType: text("entity_type"), // "page", "account", etc.
  jobData: jsonb("job_data"), // Original job data
  result: jsonb("result"), // Job result/output
  error: text("error"), // Error message if failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questionSchedules = pgTable("question_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pageId: uuid("page_id")
    .notNull()
    .references(() => notionPages.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // User-defined name for the schedule
  isActive: boolean("is_active").default(true),
  frequency: text("frequency").notNull(), // "daily", "weekly", "monthly", "on_change"
  cronExpression: text("cron_expression"), // For custom schedules
  questionTypes: jsonb("question_types")
    .$type<string[]>()
    .default(["multiple_choice", "short_answer"]),
  difficulty: text("difficulty").default("medium"),
  questionCount: integer("question_count").default(5),
  focusAreas: jsonb("focus_areas").$type<string[]>(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  runCount: integer("run_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
