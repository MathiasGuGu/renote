import { eq, desc, and } from "drizzle-orm";
import { db } from "../config";
import { jobHistory, questionSchedules } from "../schema/job-history";

export type JobHistoryRecord = {
  id: string;
  userId: string;
  jobId: string;
  jobType: string;
  status: string;
  priority?: number | null;
  triggerType: string;
  entityId?: string | null;
  entityType?: string | null;
  jobData?: any | null;
  result?: any | null;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number | null;
  retryCount?: number | null;
  maxRetries?: number | null;
  nextRetryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionSchedule = {
  id: string;
  userId: string;
  pageId: string;
  name: string;
  isActive?: boolean | null;
  frequency: string;
  cronExpression?: string | null;
  questionTypes?: string[] | null;
  difficulty?: string | null;
  questionCount?: number | null;
  focusAreas?: string[] | null;
  lastRun?: Date | null;
  nextRun?: Date | null;
  runCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Job History functions
export async function createJobHistory(data: {
  userId: string;
  jobId: string;
  jobType: string;
  status: string;
  priority?: number;
  triggerType?: string;
  entityId?: string;
  entityType?: string;
  jobData?: any;
  maxRetries?: number;
}): Promise<JobHistoryRecord> {
  const [record] = await db
    .insert(jobHistory)
    .values({
      userId: data.userId,
      jobId: data.jobId,
      jobType: data.jobType,
      status: data.status,
      priority: data.priority,
      triggerType: data.triggerType || "user",
      entityId: data.entityId,
      entityType: data.entityType,
      jobData: data.jobData,
      maxRetries: data.maxRetries,
    })
    .returning();

  return record as JobHistoryRecord;
}

export async function updateJobHistory(
  jobId: string,
  data: {
    status?: string;
    result?: any;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    retryCount?: number;
    nextRetryAt?: Date;
  }
): Promise<JobHistoryRecord> {
  const [record] = await db
    .update(jobHistory)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(jobHistory.jobId, jobId))
    .returning();

  return record as JobHistoryRecord;
}

export async function getJobHistoryByUser(
  userId: string,
  limit = 50,
  offset = 0
): Promise<JobHistoryRecord[]> {
  const records = await db
    .select()
    .from(jobHistory)
    .where(eq(jobHistory.userId, userId))
    .orderBy(desc(jobHistory.createdAt))
    .limit(limit)
    .offset(offset);

  return records as JobHistoryRecord[];
}

export async function getJobHistoryByType(
  userId: string,
  jobType: string,
  limit = 20
): Promise<JobHistoryRecord[]> {
  const records = await db
    .select()
    .from(jobHistory)
    .where(and(eq(jobHistory.userId, userId), eq(jobHistory.jobType, jobType)))
    .orderBy(desc(jobHistory.createdAt))
    .limit(limit);

  return records as JobHistoryRecord[];
}

export async function getJobHistoryByEntity(
  userId: string,
  entityId: string,
  entityType: string
): Promise<JobHistoryRecord[]> {
  const records = await db
    .select()
    .from(jobHistory)
    .where(
      and(
        eq(jobHistory.userId, userId),
        eq(jobHistory.entityId, entityId),
        eq(jobHistory.entityType, entityType)
      )
    )
    .orderBy(desc(jobHistory.createdAt));

  return records as JobHistoryRecord[];
}

export async function getJobHistoryByStatus(
  status: string,
  limit = 50
): Promise<JobHistoryRecord[]> {
  const records = await db
    .select()
    .from(jobHistory)
    .where(eq(jobHistory.status, status))
    .orderBy(desc(jobHistory.createdAt))
    .limit(limit);

  return records as JobHistoryRecord[];
}

// Question Schedule functions
export async function createQuestionSchedule(data: {
  userId: string;
  pageId: string;
  name: string;
  frequency: string;
  cronExpression?: string;
  questionTypes?: string[];
  difficulty?: string;
  questionCount?: number;
  focusAreas?: string[];
}): Promise<QuestionSchedule> {
  const [schedule] = await db
    .insert(questionSchedules)
    .values({
      userId: data.userId,
      pageId: data.pageId,
      name: data.name,
      frequency: data.frequency,
      cronExpression: data.cronExpression,
      questionTypes: data.questionTypes,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      focusAreas: data.focusAreas,
      nextRun: calculateNextRun(data.frequency, data.cronExpression),
    })
    .returning();

  return schedule as QuestionSchedule;
}

export async function getQuestionSchedulesByUser(
  userId: string
): Promise<QuestionSchedule[]> {
  const schedules = await db
    .select()
    .from(questionSchedules)
    .where(eq(questionSchedules.userId, userId))
    .orderBy(desc(questionSchedules.createdAt));

  return schedules as QuestionSchedule[];
}

export async function getQuestionSchedulesByPage(
  userId: string,
  pageId: string
): Promise<QuestionSchedule[]> {
  const schedules = await db
    .select()
    .from(questionSchedules)
    .where(
      and(
        eq(questionSchedules.userId, userId),
        eq(questionSchedules.pageId, pageId)
      )
    )
    .orderBy(desc(questionSchedules.createdAt));

  return schedules as QuestionSchedule[];
}

export async function updateQuestionSchedule(
  scheduleId: string,
  data: {
    name?: string;
    isActive?: boolean;
    frequency?: string;
    cronExpression?: string;
    questionTypes?: string[];
    difficulty?: string;
    questionCount?: number;
    focusAreas?: string[];
    lastRun?: Date;
    nextRun?: Date;
    runCount?: number;
  }
): Promise<QuestionSchedule> {
  const [schedule] = await db
    .update(questionSchedules)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(questionSchedules.id, scheduleId))
    .returning();

  return schedule as QuestionSchedule;
}

export async function deleteQuestionSchedule(
  scheduleId: string
): Promise<void> {
  await db
    .delete(questionSchedules)
    .where(eq(questionSchedules.id, scheduleId));
}

export async function getActiveSchedules(): Promise<QuestionSchedule[]> {
  const now = new Date();
  const schedules = await db
    .select()
    .from(questionSchedules)
    .where(
      and(
        eq(questionSchedules.isActive, true)
        // Add condition for nextRun <= now when we implement scheduling
      )
    );

  return schedules as QuestionSchedule[];
}

// Helper function to calculate next run time
function calculateNextRun(frequency: string, cronExpression?: string): Date {
  const now = new Date();

  switch (frequency) {
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      return nextMonth;
    case "custom":
      // For custom cron expressions, you'd use a cron parser library
      // For now, default to daily
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
