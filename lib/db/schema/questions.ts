import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { notionPages } from "./notion-pages";

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  notionPageId: uuid("notion_page_id")
    .notNull()
    .references(() => notionPages.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "multiple_choice", "short_answer", "essay", "flashcard"
  question: text("question").notNull(),
  answer: text("answer"), // Correct answer or sample answer
  options: jsonb("options").$type<string[]>(), // For multiple choice questions
  difficulty: text("difficulty").default("medium"), // "easy", "medium", "hard"
  tags: jsonb("tags").$type<string[]>(), // Topic tags
  aiModel: text("ai_model"), // Which AI model was used
  aiPrompt: text("ai_prompt"), // Prompt used for generation
  confidence: integer("confidence"), // AI confidence score (1-100)
  metadata: jsonb("metadata"), // Additional AI response data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Phase 3: Version tracking for incremental processing
  sourceContentHash: text("source_content_hash"), // Hash of source content that generated this question
  sourceVersion: integer("source_version"), // Version of source content when question was generated
  lastValidatedAt: timestamp("last_validated_at"), // When question was last validated against source
  isStale: text("is_stale").default("false"), // Whether source content has changed since generation
});
