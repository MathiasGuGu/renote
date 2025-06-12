import { eq, desc } from "drizzle-orm";
import { db } from "../config";
import { questions } from "../schema/questions";

export type Question = {
  id: string;
  notionPageId: string;
  type: string;
  question: string;
  answer?: string | null;
  options?: string[] | null;
  difficulty?: string | null;
  tags?: string[] | null;
  aiModel?: string | null;
  aiPrompt?: string | null;
  confidence?: number | null;
  metadata?: any | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createQuestion(data: {
  notionPageId: string;
  type: string;
  question: string;
  answer?: string;
  options?: string[];
  difficulty?: string;
  tags?: string[];
  aiModel?: string;
  aiPrompt?: string;
  confidence?: number;
  metadata?: any;
}): Promise<Question> {
  const [question] = await db
    .insert(questions)
    .values({
      notionPageId: data.notionPageId,
      type: data.type,
      question: data.question,
      answer: data.answer,
      options: data.options,
      difficulty: data.difficulty || "medium",
      tags: data.tags,
      aiModel: data.aiModel,
      aiPrompt: data.aiPrompt,
      confidence: data.confidence,
      metadata: data.metadata,
    })
    .returning();

  return question as Question;
}

export async function getQuestionsByPageId(
  notionPageId: string
): Promise<Question[]> {
  const results = await db
    .select()
    .from(questions)
    .where(eq(questions.notionPageId, notionPageId))
    .orderBy(desc(questions.createdAt));

  return results as Question[];
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);

  return question ? (question as Question) : null;
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.delete(questions).where(eq(questions.id, id));
}

export async function deleteQuestionsByPageId(
  notionPageId: string
): Promise<void> {
  await db.delete(questions).where(eq(questions.notionPageId, notionPageId));
}

export async function createMultipleQuestions(
  questionData: Array<{
    notionPageId: string;
    type: string;
    question: string;
    answer?: string;
    options?: string[];
    difficulty?: string;
    tags?: string[];
    aiModel?: string;
    aiPrompt?: string;
    confidence?: number;
    metadata?: any;
  }>
): Promise<Question[]> {
  const results = await db
    .insert(questions)
    .values(
      questionData.map(data => ({
        notionPageId: data.notionPageId,
        type: data.type,
        question: data.question,
        answer: data.answer,
        options: data.options,
        difficulty: data.difficulty || "medium",
        tags: data.tags,
        aiModel: data.aiModel,
        aiPrompt: data.aiPrompt,
        confidence: data.confidence,
        metadata: data.metadata,
      }))
    )
    .returning();

  return results as Question[];
}
