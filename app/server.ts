"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  createUser,
  getUserByClerkId,
  getUserOrCreate,
  updateUser,
} from "@/lib/db/queries/users";
import {
  createNotionAccount as createNotionAccountDB,
  getNotionAccountsByUserId,
  getNotionAccountById,
  updateNotionAccount,
  deleteNotionAccount,
  updateLastSync,
  updateSyncError,
} from "@/lib/db/queries/notion-accounts";
import {
  upsertNotionDatabase,
  getNotionDatabasesByAccountId,
  deleteNotionDatabasesByAccountId,
} from "@/lib/db/queries/notion-databases";
import {
  upsertNotionPage,
  getNotionPagesByAccountId,
  deleteNotionPagesByAccountId,
  getNotionPageById,
  getPagesRequiringProcessing,
  getUnprocessedPages,
  markPageAsProcessed,
  markPagesForProcessing,
  getProcessingStats,
} from "@/lib/db/queries/notion-pages";
import {
  createMultipleQuestions,
  getQuestionsByPageId,
  deleteQuestionsByPageId,
} from "@/lib/db/queries/questions";
import { NotionOAuthResponse } from "@/lib/notion/types";
import { NotionClient } from "@/lib/notion/client";
import {
  QuestionGenerator,
  QuestionGenerationOptions,
} from "@/lib/ai/question-generator";
import { simpleJobQueue } from "@/lib/jobs/simple-queue";
import {
  createJobHistory,
  getJobHistoryByUser,
  getJobHistoryByEntity,
  createQuestionSchedule,
  getQuestionSchedulesByUser,
  getQuestionSchedulesByPage,
  updateQuestionSchedule,
  deleteQuestionSchedule,
} from "@/lib/db/queries/job-history";
import { NotionChangeDetector } from "@/lib/notion/change-detector";
import {
  generateContentHash,
  generateTitleHash,
  generatePropertiesHash,
  extractTextFromNotionBlocks,
} from "@/lib/utils";
import {
  initializeUserScheduling,
  getUserSchedulingStatus,
} from "@/lib/scheduling/sync-scheduler";
import {
  checkQuestionDuplicate,
  generateUniqueQuestions,
} from "@/lib/ai/duplicate-prevention";

// ========================
// USER OPERATIONS
// ========================

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  return await getUserByClerkId(clerkId);
}

export async function ensureUserExists(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  return await getUserOrCreate({
    clerkId,
    ...userData,
  });
}

export async function updateUserPreferences(preferences: {
  theme?: "light" | "dark";
  notifications?: boolean;
  language?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const user = await updateUser(clerkId, { preferences });
  revalidatePath("/settings");
  return user;
}

// ========================
// NOTION ACCOUNT OPERATIONS
// ========================

export async function createNotionAccount(oauthData: NotionOAuthResponse) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }

  try {
    const account = await createNotionAccountDB({
      userId: user.id,
      workspaceName: oauthData.workspace_name,
      workspaceId: oauthData.workspace_id,
      workspaceIcon: oauthData.workspace_icon,
      accessToken: oauthData.access_token,
      botId: oauthData.bot_id,
      owner: oauthData.owner,
      duplicatedTemplateId: oauthData.duplicated_template_id,
      requestId: oauthData.request_id,
    });

    revalidatePath("/settings");
    return account;
  } catch (error) {
    console.error("Error creating Notion account:", error);
    throw new Error("Failed to create Notion account");
  }
}

export async function getUserNotionAccounts() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  return await getNotionAccountsByUserId(user.id);
}

export async function removeNotionAccount(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await deleteNotionAccount(user.id, accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error removing Notion account:", error);
    throw new Error("Failed to remove Notion account");
  }
}

export async function updateNotionAccountStatus(
  accountId: string,
  status: "connected" | "disconnected" | "error"
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const account = await updateNotionAccount(accountId, { status });
  revalidatePath("/settings");
  return account;
}

export async function recordNotionSync(
  accountId: string,
  success: boolean,
  error?: string
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (success) {
    await updateLastSync(accountId, new Date());
    await updateSyncError(accountId, null);
  } else {
    await updateSyncError(accountId, error || "Unknown sync error");
  }

  revalidatePath("/settings");
}

// ========================
// NOTION INTEGRATION STATS
// ========================

export async function getNotionIntegrationStats(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const databases = await getNotionDatabasesByAccountId(accountId);
    const pages = await getNotionPagesByAccountId(accountId);
    const account = await getNotionAccountById(accountId);

    return {
      totalDatabases: databases.length,
      totalPages: pages.length,
      lastSync: account?.lastSync || null,
      syncErrors: account?.syncError ? 1 : 0,
    };
  } catch (error) {
    console.error("Error getting integration stats:", error);
    return {
      totalDatabases: 0,
      totalPages: 0,
      lastSync: null,
      syncErrors: 1,
    };
  }
}

// ========================
// SYNC HELPER FUNCTIONS
// ========================

async function syncDatabases(
  client: NotionClient,
  accountId: string
): Promise<void> {
  console.log(`Starting database sync for account ${accountId}`);

  try {
    const notionDatabases = await client.getDatabases();
    console.log(`Found ${notionDatabases.length} databases from Notion`);

    for (const notionDb of notionDatabases) {
      try {
        await upsertNotionDatabase({
          accountId,
          notionId: notionDb.id,
          title: notionDb.title,
          description: (notionDb as any).description,
          url: notionDb.url,
          cover: notionDb.cover,
          icon: notionDb.icon,
          properties: notionDb.properties,
          parent: notionDb.parent,
          archived: (notionDb as any).archived ? "true" : "false",
          inTrash: (notionDb as any).in_trash ? "true" : "false",
          isInline: (notionDb as any).is_inline ? "true" : "false",
          publicUrl: (notionDb as any).public_url,
          pageCount: 0, // We'll update this when syncing pages
          lastEditedTime: new Date(notionDb.lastEditedTime),
          createdTime: new Date((notionDb as any).created_time),
        });
        console.log(`Synced database: ${notionDb.title}`);
      } catch (error) {
        console.error(`Error syncing database ${notionDb.title}:`, error);
      }
    }

    console.log(`Database sync completed for account ${accountId}`);
  } catch (error) {
    console.error(`Database sync failed for account ${accountId}:`, error);
    throw error;
  }
}

async function syncPages(
  client: NotionClient,
  accountId: string
): Promise<void> {
  console.log(`Starting page sync for account ${accountId}`);

  try {
    const notionPages = await client.getPages();
    console.log(`Found ${notionPages.length} pages from Notion`);

    for (const notionPage of notionPages) {
      try {
        // Get page content (blocks)
        let content = null;
        try {
          content = await client.getPageContent(notionPage.id);
        } catch (error) {
          console.warn(
            `Could not fetch content for page ${notionPage.title}:`,
            error
          );
        }

        await upsertNotionPage({
          accountId,
          notionId: notionPage.id,
          title: notionPage.title,
          url: notionPage.url,
          cover: notionPage.cover,
          icon: notionPage.icon,
          parent: notionPage.parent,
          properties: notionPage.properties,
          content: content,
          archived: (notionPage as any).archived ? "true" : "false",
          inTrash: (notionPage as any).in_trash ? "true" : "false",
          publicUrl: (notionPage as any).public_url,
          lastEditedTime: new Date(notionPage.lastEditedTime),
          createdTime: new Date((notionPage as any).created_time),
        });
        console.log(`Synced page: ${notionPage.title}`);
      } catch (error) {
        console.error(`Error syncing page ${notionPage.title}:`, error);
      }
    }

    console.log(`Page sync completed for account ${accountId}`);
  } catch (error) {
    console.error(`Page sync failed for account ${accountId}:`, error);
    throw error;
  }
}

// ========================
// NOTION OAUTH HELPERS
// ========================

export async function exchangeNotionCode(
  code: string
): Promise<NotionOAuthResponse> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Notion OAuth configuration");
  }

  // Notion requires Basic authentication for token exchange
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const requestBody = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
  };

  console.log("OAuth request with Basic auth:", {
    grant_type: requestBody.grant_type,
    code: code?.substring(0, 10) + "...",
    redirect_uri: requestBody.redirect_uri,
    hasBasicAuth: true,
  });

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Notion OAuth error:", error);
    console.error("Response status:", response.status);
    throw new Error(
      `Failed to exchange authorization code: ${response.status} - ${error}`
    );
  }

  const result = await response.json();
  console.log("OAuth success! Received workspace:", result.workspace_name);

  return result;
}

// ========================
// BACKGROUND SYNC OPERATIONS
// ========================

export async function syncNotionAccount(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const account = await getNotionAccountById(accountId);
  if (!account || account.userId !== user.id) {
    throw new Error("Account not found or unauthorized");
  }

  try {
    const notionClient = new NotionClient(account.accessToken);
    await syncDatabases(notionClient, accountId);
    await syncPages(notionClient, accountId);

    await recordNotionSync(accountId, true);
    return { success: true };
  } catch (error) {
    console.error("Sync error:", error);
    await recordNotionSync(
      accountId,
      false,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

export async function syncAllNotionAccounts() {
  const accounts = await getUserNotionAccounts();
  const results = [];

  for (const account of accounts) {
    try {
      await syncNotionAccount(account.id);
      results.push({ accountId: account.id, success: true });
    } catch (error) {
      results.push({
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  revalidatePath("/settings");
  return results;
}

export async function triggerNotionSync(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await syncNotionAccount(accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Manual sync failed:", error);
    throw new Error("Failed to sync Notion account");
  }
}

// ========================
// AI QUESTION GENERATION
// ========================

export async function generateQuestionsForPage(
  pageId: string,
  options: QuestionGenerationOptions = {}
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the page from our database
    const page = await getNotionPageById(pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    // Extract text content from the page
    const content = extractContentFromPage(page);
    if (!content || content.length < 100) {
      throw new Error(
        "Page content is too short to generate meaningful questions"
      );
    }

    // Generate questions using AI
    const generator = new QuestionGenerator();
    const generatedQuestions = await generator.generateQuestions(
      content,
      page.title,
      {
        questionTypes: options.questionTypes || [
          "multiple_choice",
          "short_answer",
        ],
        difficulty: options.difficulty || "medium",
        count: options.count || 5,
        focusAreas: options.focusAreas || [],
      }
    );

    // Save questions to database
    const questionsData = generatedQuestions.map(q => ({
      notionPageId: pageId,
      type: q.type,
      question: q.question,
      answer: q.answer,
      options: q.options,
      difficulty: q.difficulty,
      tags: q.tags,
      aiModel: "gpt-3.5-turbo",
      aiPrompt: "Generated via QuestionGenerator service",
      confidence: q.confidence,
      metadata: { generatedAt: new Date().toISOString() },
    }));

    const savedQuestions = await createMultipleQuestions(questionsData);

    revalidatePath("/test/notion-pages");
    return {
      success: true,
      questions: savedQuestions,
      count: savedQuestions.length,
    };
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate questions"
    );
  }
}

export async function getPageQuestions(pageId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const page = await getNotionPageById(pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const questions = await getQuestionsByPageId(pageId);
    return { page, questions };
  } catch (error) {
    console.error("Error fetching page questions:", error);
    throw new Error("Failed to fetch questions");
  }
}

export async function deletePageQuestions(pageId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await deleteQuestionsByPageId(pageId);
    revalidatePath("/test/notion-pages");
    return { success: true };
  } catch (error) {
    console.error("Error deleting questions:", error);
    throw new Error("Failed to delete questions");
  }
}

export async function estimateQuestionGenerationCost(
  pageId: string,
  options: QuestionGenerationOptions = {}
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const page = await getNotionPageById(pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const content = extractContentFromPage(page);
    if (!content) {
      return { cost: 0, tokens: 0, error: "No content to analyze" };
    }

    const generator = new QuestionGenerator();
    const tokens = await generator.estimateTokens(content);
    const cost = await generator.estimateCost(content, options);

    return {
      cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
      tokens,
      characterCount: content.length,
    };
  } catch (error) {
    console.error("Error estimating cost:", error);
    throw new Error("Failed to estimate cost");
  }
}

// Helper function to extract text content from Notion page data
function extractContentFromPage(page: any): string {
  let content = page.title || "";

  // Extract content from page blocks if available
  if (page.content && Array.isArray(page.content.results)) {
    const blockTexts = page.content.results
      .map((block: any) => extractTextFromBlock(block))
      .filter(Boolean);
    content += "\n\n" + blockTexts.join("\n\n");
  }

  // Fallback to properties if no block content
  if (content.length < 100 && page.properties) {
    const propertyTexts = Object.values(page.properties)
      .map((prop: any) => extractTextFromProperty(prop))
      .filter(Boolean);
    content += "\n\n" + propertyTexts.join("\n");
  }

  return content.trim();
}

// Helper function to extract text from Notion blocks
function extractTextFromBlock(block: any): string {
  if (!block) return "";

  const blockType = block.type;
  if (!blockType || !block[blockType]) return "";

  const blockData = block[blockType];

  // Handle rich text blocks
  if (blockData.rich_text && Array.isArray(blockData.rich_text)) {
    return blockData.rich_text
      .map((text: any) => text.plain_text || text.text?.content || "")
      .join("");
  }

  // Handle text blocks
  if (blockData.text && Array.isArray(blockData.text)) {
    return blockData.text
      .map((text: any) => text.plain_text || text.text?.content || "")
      .join("");
  }

  return "";
}

// Helper function to extract text from Notion properties
function extractTextFromProperty(property: any): string {
  if (!property) return "";

  switch (property.type) {
    case "title":
      return (
        property.title?.map((text: any) => text.plain_text || "").join("") || ""
      );
    case "rich_text":
      return (
        property.rich_text
          ?.map((text: any) => text.plain_text || "")
          .join("") || ""
      );
    case "select":
      return property.select?.name || "";
    case "multi_select":
      return (
        property.multi_select?.map((item: any) => item.name).join(", ") || ""
      );
    default:
      return "";
  }
}

// ========================
// BACKGROUND JOB MANAGEMENT
// ========================

export async function enqueueQuestionGeneration(
  pageId: string,
  options: QuestionGenerationOptions = {},
  delay = 0,
  triggerType: "user" | "scheduled" | "bulk" = "user"
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Enqueue the job with proper priority and trigger type
    const jobId = await simpleJobQueue.enqueue(
      "generate-questions",
      {
        pageId,
        userId: user.id,
        options: {
          questionTypes: options.questionTypes || [
            "multiple_choice",
            "short_answer",
          ],
          difficulty: options.difficulty || "medium",
          count: options.count || 5,
          focusAreas: options.focusAreas || [],
        },
      },
      {
        triggerType,
        delay, // Delay in seconds
      }
    );

    if (!jobId) {
      throw new Error("Failed to enqueue job");
    }

    // Job is automatically recorded in history by the queue

    // Only revalidate if this is a user-triggered job to avoid infinite loops
    if (triggerType === "user") {
      revalidatePath("/test/notion-pages");
    }

    return {
      success: true,
      jobId,
      estimatedCompletion: new Date(Date.now() + (delay + 30) * 1000), // Estimate 30s processing time
    };
  } catch (error) {
    console.error("Error enqueuing question generation:", error);
    throw new Error("Failed to enqueue question generation job");
  }
}

export async function enqueueSyncJob(
  accountId: string,
  delay = 0,
  triggerType: "user" | "scheduled" | "bulk" = "user"
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const jobId = await simpleJobQueue.enqueue(
      "sync-notion-account",
      {
        accountId,
        userId: user.id,
      },
      {
        triggerType,
        delay,
        priority: 2, // Higher priority for sync jobs
      }
    );

    if (!jobId) {
      throw new Error("Failed to enqueue sync job");
    }

    // Job is automatically recorded in history by the queue

    // Only revalidate if this is a user-triggered job to avoid infinite loops
    if (triggerType === "user") {
      revalidatePath("/settings");
    }

    return {
      success: true,
      jobId,
      estimatedCompletion: new Date(Date.now() + (delay + 60) * 1000), // Estimate 60s for sync
    };
  } catch (error) {
    console.error("Error enqueuing sync job:", error);
    throw new Error("Failed to enqueue sync job");
  }
}

export async function getJobStatus(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Since simpleJobQueue getJobById requires both name and id, we'll use our job history instead
    // Since pg-boss getJobById requires both name and id, we'll use our job history instead
    const history = await getJobHistoryByUser(user.id, 100, 0);
    const jobRecord = history.find(job => job.jobId === jobId);

    if (!jobRecord) {
      return {
        jobId,
        status: "not_found",
        error: "Job not found in history",
      };
    }

    return {
      jobId,
      status: jobRecord.status,
      data: jobRecord.jobData,
      result: jobRecord.result,
      error: jobRecord.error,
      createdAt: jobRecord.createdAt,
      startedAt: jobRecord.startedAt,
      completedAt: jobRecord.completedAt,
    };
  } catch (error) {
    console.error("Error getting job status:", error);
    throw new Error("Failed to get job status");
  }
}

export async function getUserJobHistory(limit = 50, offset = 0) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] server.ts: getUserJobHistory() called with limit=${limit}, offset=${offset}`
  );
  console.trace("Server action call stack");

  const user = await getCurrentUser();
  if (!user) {
    console.log(
      `[${timestamp}] server.ts: getUserJobHistory() - No user found, throwing unauthorized`
    );
    throw new Error("Unauthorized");
  }

  try {
    console.log(
      `[${timestamp}] server.ts: getUserJobHistory() - Calling getJobHistoryByUser for user ${user.id}`
    );
    const history = await getJobHistoryByUser(user.id, limit, offset);
    console.log(
      `[${timestamp}] server.ts: getUserJobHistory() - Retrieved ${history.length} job records`
    );
    return history;
  } catch (error) {
    console.error(
      `[${timestamp}] server.ts: getUserJobHistory() - Error:`,
      error
    );
    throw new Error("Failed to get job history");
  }
}

export async function getPageJobHistory(pageId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const history = await getJobHistoryByEntity(user.id, pageId, "page");
    return history;
  } catch (error) {
    console.error("Error getting page job history:", error);
    throw new Error("Failed to get page job history");
  }
}

export async function cancelJob(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Note: Direct job cancellation temporarily disabled due to pg-boss API compatibility
    // For now, jobs will continue to run until completion
    console.log(`Job cancellation requested for ${jobId} but not implemented`);

    // No revalidation needed since no actual cancellation occurs

    return { success: false, message: "Job cancellation not yet implemented" };
  } catch (error) {
    console.error("Error cancelling job:", error);
    throw new Error("Failed to cancel job");
  }
}

// ========================
// QUESTION SCHEDULING
// ========================

export async function createPageSchedule(data: {
  pageId: string;
  name: string;
  frequency: string;
  questionTypes?: string[];
  difficulty?: string;
  questionCount?: number;
  focusAreas?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const schedule = await createQuestionSchedule({
      userId: user.id,
      pageId: data.pageId,
      name: data.name,
      frequency: data.frequency,
      questionTypes: data.questionTypes,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      focusAreas: data.focusAreas,
    });

    revalidatePath("/test/notion-pages");

    return { success: true, schedule };
  } catch (error) {
    console.error("Error creating schedule:", error);
    throw new Error("Failed to create schedule");
  }
}

export async function getUserSchedules() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const schedules = await getQuestionSchedulesByUser(user.id);
    return schedules;
  } catch (error) {
    console.error("Error getting schedules:", error);
    throw new Error("Failed to get schedules");
  }
}

export async function getPageSchedules(pageId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const schedules = await getQuestionSchedulesByPage(user.id, pageId);
    return schedules;
  } catch (error) {
    console.error("Error getting page schedules:", error);
    throw new Error("Failed to get page schedules");
  }
}

export async function updatePageSchedule(
  scheduleId: string,
  data: {
    name?: string;
    isActive?: boolean;
    frequency?: string;
    questionTypes?: string[];
    difficulty?: string;
    questionCount?: number;
    focusAreas?: string[];
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const schedule = await updateQuestionSchedule(scheduleId, data);
    revalidatePath("/test/notion-pages");

    return { success: true, schedule };
  } catch (error) {
    console.error("Error updating schedule:", error);
    throw new Error("Failed to update schedule");
  }
}

export async function deletePageSchedule(scheduleId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await deleteQuestionSchedule(scheduleId);
    revalidatePath("/test/notion-pages");

    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule:", error);
    throw new Error("Failed to delete schedule");
  }
}

// ========================
// PHASE 3: CHANGE DETECTION & INCREMENTAL PROCESSING
// ========================

/**
 * Detect changes in synced Notion pages and mark for processing
 */
export async function detectPageChanges(accountId?: string): Promise<{
  totalPages: number;
  changedPages: number;
  prioritizedPages: Array<{ pageId: string; priority: number; reason: string }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get all pages for the account
    let allPages: any[];

    if (accountId) {
      allPages = await getNotionPagesByAccountId(accountId);
    } else {
      const accounts = await getUserNotionAccounts();
      const pagePromises = accounts.map(account =>
        getNotionPagesByAccountId(account.id)
      );
      const pageArrays = await Promise.all(pagePromises);
      allPages = pageArrays.flat();
    }

    const changedPages: Array<{
      pageId: string;
      priority: number;
      reason: string;
    }> = [];
    const pageIdsToUpdate: string[] = [];

    for (const page of allPages) {
      // Prepare current page data
      const currentPageData = {
        title: page.title,
        content: page.content,
        properties: page.properties,
        lastEditedTime: page.lastEditedTime,
      };

      // Prepare stored page data
      const storedPageData = {
        contentHash: page.contentHash,
        titleHash: page.titleHash,
        propertiesHash: page.propertiesHash,
        lastProcessedHash: page.lastProcessedHash,
        lastProcessedAt: page.lastProcessedAt,
        processingVersion: page.processingVersion,
        lastEditedTime: page.lastEditedTime,
      };

      // Detect changes
      const changeResult = NotionChangeDetector.detectChanges(
        currentPageData,
        storedPageData
      );

      if (changeResult.requiresProcessing) {
        const strategy =
          NotionChangeDetector.getProcessingStrategy(changeResult);

        changedPages.push({
          pageId: page.id,
          priority: changeResult.processingPriority,
          reason: strategy.reason,
        });

        pageIdsToUpdate.push(page.id);

        // Update the page with new hashes and change detection info
        await upsertNotionPage({
          ...page,
          contentHash: changeResult.hashes.content,
          titleHash: changeResult.hashes.title,
          propertiesHash: changeResult.hashes.properties,
          requiresProcessing: "true",
          changeDetectedAt: new Date(),
        });
      }
    }

    // Sort by priority (highest first)
    const prioritizedPages = changedPages.sort(
      (a, b) => b.priority - a.priority
    );

    return {
      totalPages: allPages.length,
      changedPages: changedPages.length,
      prioritizedPages,
    };
  } catch (error) {
    console.error("Error detecting page changes:", error);
    throw new Error("Failed to detect changes");
  }
}

/**
 * Get pages that require processing with priority ordering
 */
export async function getPageProcessingQueue(
  accountId?: string,
  limit: number = 50
): Promise<{
  pendingPages: any[];
  unprocessedPages: any[];
  processingStats: any;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const pendingPages = await getPagesRequiringProcessing(accountId, limit);
    const unprocessedPages = await getUnprocessedPages(accountId, limit);

    let processingStats = null;
    if (accountId) {
      processingStats = await getProcessingStats(accountId);
    }

    return {
      pendingPages,
      unprocessedPages,
      processingStats,
    };
  } catch (error) {
    console.error("Error getting processing queue:", error);
    throw new Error("Failed to get processing queue");
  }
}

/**
 * Process questions for a single page with change detection
 */
export async function processPageQuestions(
  pageId: string,
  options: {
    questionTypes?: string[];
    difficulty?: string;
    count?: number;
    forceReprocess?: boolean;
  } = {}
): Promise<{
  success: boolean;
  questionsGenerated: number;
  processingStrategy: string;
  contentQuality: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the page
    const page = await getNotionPageById(pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    // Extract text content for AI processing
    const extractedText = extractTextFromNotionBlocks(
      page.content?.results || []
    );

    if (!extractedText || extractedText.trim().length < 20) {
      throw new Error("Insufficient content for question generation");
    }

    // Check if reprocessing is needed
    const currentContentHash = generateContentHash(page.content);
    const needsReprocessing =
      options.forceReprocess ||
      NotionChangeDetector.needsReprocessing(
        currentContentHash,
        page.lastProcessedHash,
        page.lastProcessedAt
      );

    if (!needsReprocessing) {
      // Return existing questions
      const existingQuestions = await getQuestionsByPageId(pageId);
      return {
        success: true,
        questionsGenerated: existingQuestions.length,
        processingStrategy: "cached",
        contentQuality: 100, // Assume previously processed content was good
      };
    }

    // Detect processing strategy
    const changeResult = NotionChangeDetector.detectChanges(
      {
        title: page.title,
        content: page.content,
        properties: page.properties,
        lastEditedTime: page.lastEditedTime,
      },
      {
        contentHash: page.contentHash,
        titleHash: page.titleHash,
        propertiesHash: page.propertiesHash,
        lastProcessedHash: page.lastProcessedHash,
        lastProcessedAt: page.lastProcessedAt,
        processingVersion: page.processingVersion,
        lastEditedTime: page.lastEditedTime,
      }
    );

    const strategy = NotionChangeDetector.getProcessingStrategy(changeResult);

    // Generate questions using existing AI system
    const questionsResult = await generateQuestionsForPage(pageId, {
      questionTypes: options.questionTypes || [
        "multiple_choice",
        "short_answer",
      ],
      difficulty: options.difficulty || "medium",
      count: options.count || 5,
    });

    // Mark page as processed
    await markPageAsProcessed(
      pageId,
      currentContentHash,
      (page.processingVersion || 0) + 1
    );

    // Update question metadata with version tracking
    for (const question of questionsResult.questions) {
      await updateQuestionMetadata(question.id, {
        sourceContentHash: currentContentHash,
        sourceVersion: (page.processingVersion || 0) + 1,
        lastValidatedAt: new Date(),
        isStale: "false",
      });
    }

    return {
      success: true,
      questionsGenerated: questionsResult.questions.length,
      processingStrategy: strategy.strategy,
      contentQuality: changeResult.contentQuality,
    };
  } catch (error) {
    console.error("Error processing page questions:", error);
    throw new Error(
      `Failed to process questions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Batch process multiple pages with intelligent prioritization
 */
export async function batchProcessPages(
  accountId: string,
  options: {
    maxPages?: number;
    priorityThreshold?: number;
    questionTypes?: string[];
    difficulty?: string;
    count?: number;
  } = {}
): Promise<{
  processedPages: number;
  totalQuestions: number;
  skippedPages: number;
  errors: Array<{ pageId: string; error: string }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get prioritized processing queue
    const { pendingPages, unprocessedPages } = await getPageProcessingQueue(
      accountId,
      options.maxPages || 20
    );

    // Combine and sort by priority
    const allPages = [...pendingPages, ...unprocessedPages];

    // Early exit: Check if there are any pages that need processing
    if (allPages.length === 0) {
      console.log(
        "✋ No pages found requiring processing - stopping batch processing pipeline"
      );
      console.log("💡 This saves AI costs and processing time!");
      return {
        processedPages: 0,
        totalQuestions: 0,
        skippedPages: 0,
        errors: [],
      };
    }

    const prioritizedPages = allPages.sort((a, b) => {
      const aPriority = a.requiresProcessing === "true" ? 100 : 50;
      const bPriority = b.requiresProcessing === "true" ? 100 : 50;
      return bPriority - aPriority;
    });

    // Early exit: Check if any pages meet the priority threshold
    const eligiblePages = prioritizedPages.filter(
      page =>
        !options.priorityThreshold ||
        page.processingPriority >= options.priorityThreshold
    );

    if (eligiblePages.length === 0) {
      console.log(
        `✋ No pages meet priority threshold (${options.priorityThreshold || 0}) - stopping batch processing pipeline`
      );
      console.log("💡 This saves AI costs and processing time!");
      return {
        processedPages: 0,
        totalQuestions: 0,
        skippedPages: allPages.length,
        errors: [],
      };
    }

    console.log(
      `🚀 Processing ${eligiblePages.length} pages that meet criteria...`
    );

    let processedPages = 0;
    let totalQuestions = 0;
    let skippedPages = 0;
    const errors: Array<{ pageId: string; error: string }> = [];

    for (const page of prioritizedPages.slice(0, options.maxPages || 20)) {
      try {
        // Check priority threshold
        if (
          options.priorityThreshold &&
          page.processingPriority < options.priorityThreshold
        ) {
          skippedPages++;
          continue;
        }

        const result = await processPageQuestions(page.id, {
          questionTypes: options.questionTypes,
          difficulty: options.difficulty,
          count: options.count,
        });

        if (result.success) {
          processedPages++;
          totalQuestions += result.questionsGenerated;
        }
      } catch (error) {
        errors.push({
          pageId: page.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `✅ Batch processing completed: ${processedPages} pages processed, ${totalQuestions} questions generated`
    );

    return {
      processedPages,
      totalQuestions,
      skippedPages,
      errors,
    };
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw new Error("Failed to batch process pages");
  }
}

/**
 * Batch process pages with enhanced duplicate prevention
 */
export async function intelligentBatchProcessing(
  accountId: string,
  options: {
    maxPages?: number;
    priorityThreshold?: number;
    ensureUniqueness?: boolean;
    maxQuestionsPerPage?: number;
  } = {}
): Promise<{
  processedPages: number;
  totalQuestions: number;
  uniqueQuestions: number;
  duplicatesPreventedCount: number;
  avgQualityScore: number;
  errors: Array<{ pageId: string; error: string }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get prioritized processing queue
    const { pendingPages, unprocessedPages } = await getPageProcessingQueue(
      accountId,
      options.maxPages || 20
    );

    // Combine and sort by priority
    const allPages = [...pendingPages, ...unprocessedPages];

    // Early exit: Check if there are any pages that need processing
    if (allPages.length === 0) {
      console.log(
        "✋ No pages found requiring intelligent processing - stopping pipeline"
      );
      console.log("💡 This saves AI costs and processing time!");
      return {
        processedPages: 0,
        totalQuestions: 0,
        uniqueQuestions: 0,
        duplicatesPreventedCount: 0,
        avgQualityScore: 0,
        errors: [],
      };
    }

    const prioritizedPages = allPages.sort((a, b) => {
      const aPriority = a.requiresProcessing === "true" ? 100 : 50;
      const bPriority = b.requiresProcessing === "true" ? 100 : 50;
      return bPriority - aPriority;
    });

    // Early exit: Check if any pages meet the priority threshold
    const eligiblePages = prioritizedPages.filter(
      page =>
        !options.priorityThreshold ||
        page.processingPriority >= options.priorityThreshold
    );

    if (eligiblePages.length === 0) {
      console.log(
        `✋ No pages meet priority threshold (${options.priorityThreshold || 0}) for intelligent processing - stopping pipeline`
      );
      console.log("💡 This saves AI costs and processing time!");
      return {
        processedPages: 0,
        totalQuestions: 0,
        uniqueQuestions: 0,
        duplicatesPreventedCount: 0,
        avgQualityScore: 0,
        errors: [],
      };
    }

    console.log(
      `🚀 Intelligent processing ${eligiblePages.length} pages that meet criteria...`
    );

    let processedPages = 0;
    let totalQuestions = 0;
    let uniqueQuestions = 0;
    let duplicatesPreventedCount = 0;
    let totalQualityScore = 0;
    const errors: Array<{ pageId: string; error: string }> = [];

    for (const page of prioritizedPages.slice(0, options.maxPages || 20)) {
      try {
        // Check priority threshold
        if (
          options.priorityThreshold &&
          page.processingPriority < options.priorityThreshold
        ) {
          continue;
        }

        // Generate unique questions for this page
        const result = await generateUniqueQuestionsForPage(page.id, {
          questionTypes: ["multiple_choice", "short_answer", "flashcard"],
          difficulty: "medium",
          count: options.maxQuestionsPerPage || 3,
          forceUnique: options.ensureUniqueness || true,
        });

        if (result.success) {
          processedPages++;
          totalQuestions += result.questions.length;
          uniqueQuestions += result.questions.filter(
            (q: any) => q.isUnique
          ).length;
          duplicatesPreventedCount += result.duplicatesPreventedCount;
          totalQualityScore += result.qualityScore;
        }
      } catch (error) {
        errors.push({
          pageId: page.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const avgQualityScore =
      processedPages > 0 ? totalQualityScore / processedPages : 0;

    console.log(
      `✅ Intelligent batch processing completed: ${processedPages} pages processed, ${totalQuestions} questions generated, ${uniqueQuestions} unique questions`
    );

    return {
      processedPages,
      totalQuestions,
      uniqueQuestions,
      duplicatesPreventedCount,
      avgQualityScore,
      errors,
    };
  } catch (error) {
    console.error("Error in intelligent batch processing:", error);
    throw new Error("Failed to perform intelligent batch processing");
  }
}

/**
 * Validate and update stale questions
 */
export async function validateStaleQuestions(accountId: string): Promise<{
  validatedQuestions: number;
  staleQuestions: number;
  updatedQuestions: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get all pages with questions for this account
    const pages = await getNotionPagesByAccountId(accountId);

    let validatedQuestions = 0;
    let staleQuestions = 0;
    let updatedQuestions = 0;

    for (const page of pages) {
      const questions = await getQuestionsByPageId(page.id);
      const currentContentHash = generateContentHash(page.content);

      for (const question of questions) {
        validatedQuestions++;

        // Check if question is stale (source content changed)
        if (question.metadata?.sourceContentHash !== currentContentHash) {
          staleQuestions++;

          // Mark question as stale
          await updateQuestionMetadata(question.id, {
            isStale: "true",
            lastValidatedAt: new Date(),
          });

          updatedQuestions++;
        } else if (question.metadata?.isStale === "true") {
          // Mark as fresh if content matches again
          await updateQuestionMetadata(question.id, {
            isStale: "false",
            lastValidatedAt: new Date(),
          });

          updatedQuestions++;
        }
      }
    }

    return {
      validatedQuestions,
      staleQuestions,
      updatedQuestions,
    };
  } catch (error) {
    console.error("Error validating stale questions:", error);
    throw new Error("Failed to validate questions");
  }
}

// Helper functions for question metadata (to be implemented based on your existing question schema)
async function updateQuestionMetadata(
  questionId: string,
  metadata: {
    sourceContentHash?: string;
    sourceVersion?: number;
    lastValidatedAt?: Date;
    isStale?: string;
  }
): Promise<void> {
  // This should update the questions table with the new metadata
  // Implementation depends on your existing question update function
  // For now, this is a placeholder
  console.log(`Updating question ${questionId} with metadata:`, metadata);
}

// ========================
// PHASE 4: SCHEDULING STRATEGY & DUPLICATE PREVENTION
// ========================

/**
 * Initialize automated scheduling for a user
 */
export async function initializeUserAutoSync(
  userId?: string,
  config?: {
    frequentSyncInterval?: number; // minutes
    maxProcessingBatch?: number;
    offHoursStart?: number; // hour
    offHoursEnd?: number; // hour
  }
): Promise<{
  success: boolean;
  message: string;
  scheduleStatus: any;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const targetUserId = userId || user.id;

  try {
    const { updateSchedulingConfiguration } = await import(
      "@/lib/scheduling/sync-scheduler"
    );

    // Use the new configuration update function that recalculates page activities
    const configUpdate = config
      ? {
          userId: targetUserId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            realTimeSync: true,
            frequentSyncInterval: config.frequentSyncInterval || 5,
            regularSyncInterval: 24,
            deepSyncInterval: 7,
            offHoursStart: config.offHoursStart || 22,
            offHoursEnd: config.offHoursEnd || 6,
            maxProcessingBatch: config.maxProcessingBatch || 5,
          },
        }
      : {
          userId: targetUserId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            realTimeSync: true,
            frequentSyncInterval: 5,
            regularSyncInterval: 24,
            deepSyncInterval: 7,
            offHoursStart: 22,
            offHoursEnd: 6,
            maxProcessingBatch: 5,
          },
        };

    const updateResult = await updateSchedulingConfiguration(
      targetUserId,
      configUpdate
    );

    if (!updateResult.success) {
      throw new Error(updateResult.message);
    }

    const scheduleStatus = getUserSchedulingStatus();

    return {
      success: true,
      message: `Automated sync initialized with ${config?.frequentSyncInterval || 5}min intervals. ${updateResult.message}`,
      scheduleStatus,
    };
  } catch (error) {
    console.error("Error initializing auto sync:", error);
    throw new Error("Failed to initialize automated sync");
  }
}

/**
 * Get current scheduling status for a user
 */
export async function getAutoSyncStatus(userId?: string): Promise<{
  isActive: boolean;
  stats: any;
  nextSyncTimes: Array<{ pageId: string; nextSync: Date; priority: string }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const targetUserId = userId || user.id;

  try {
    const stats = getUserSchedulingStatus(targetUserId);

    return {
      isActive: stats.totalPages > 0,
      stats,
      nextSyncTimes: stats.nextSyncTimes.slice(0, 10), // Show next 10 sync times
    };
  } catch (error) {
    console.error("Error getting auto sync status:", error);
    throw new Error("Failed to get sync status");
  }
}

/**
 * Enhanced question generation with duplicate prevention
 */
export async function generateUniqueQuestionsForPage(
  pageId: string,
  options: {
    questionTypes?: string[];
    difficulty?: string;
    count?: number;
    forceUnique?: boolean;
  } = {}
): Promise<{
  success: boolean;
  questions: any[];
  duplicatesPreventedCount: number;
  qualityScore: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // First generate questions using existing system
    const questionsResult = await generateQuestionsForPage(pageId, {
      questionTypes: options.questionTypes || [
        "multiple_choice",
        "short_answer",
      ],
      difficulty: options.difficulty || "medium",
      count: options.count || 5,
    });

    // Then check for duplicates and generate unique versions
    const formattedQuestions = questionsResult.questions.map(q => ({
      question: q.question,
      answer: q.answer || undefined,
      options: (q.options as string[]) || undefined,
      type: q.type,
    }));
    const uniqueQuestions = await generateUniqueQuestions(
      pageId,
      formattedQuestions
    );

    // Count how many duplicates were prevented
    const duplicatesPreventedCount = uniqueQuestions.filter(
      q => !q.isUnique
    ).length;

    // Calculate overall quality score
    const qualityScore =
      uniqueQuestions.reduce((sum, q) => {
        if (q.isUnique) return sum + 100;
        if (q.duplicateInfo && q.duplicateInfo.similarity < 50) return sum + 80;
        return sum + 60;
      }, 0) / uniqueQuestions.length;

    // Filter to only unique questions if forceUnique is true
    const finalQuestions = options.forceUnique
      ? uniqueQuestions.filter(q => q.isUnique)
      : uniqueQuestions;

    return {
      success: true,
      questions: finalQuestions,
      duplicatesPreventedCount,
      qualityScore,
    };
  } catch (error) {
    console.error("Error generating unique questions:", error);
    throw new Error("Failed to generate unique questions");
  }
}

/**
 * Real-time sync trigger for immediate processing
 */
export async function triggerRealTimeSync(accountId: string): Promise<{
  changesSynced: number;
  questionsGenerated: number;
  processingTime: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const startTime = Date.now();

  try {
    // Sync Notion pages
    console.log(`Triggering real-time sync for account ${accountId}`);

    // Detect changes
    const changes = await detectPageChanges(accountId);

    let questionsGenerated = 0;

    if (changes.changedPages > 0) {
      // Process high-priority changes immediately
      const highPriorityPages = changes.prioritizedPages.filter(
        p => p.priority >= 80
      );

      if (highPriorityPages.length > 0) {
        const batchResult = await intelligentBatchProcessing(accountId, {
          maxPages: Math.min(highPriorityPages.length, 5),
          priorityThreshold: 80,
          ensureUniqueness: true,
          maxQuestionsPerPage: 2,
        });

        questionsGenerated = batchResult.totalQuestions;
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      changesSynced: changes.changedPages,
      questionsGenerated,
      processingTime,
    };
  } catch (error) {
    console.error("Error in real-time sync:", error);
    throw new Error("Failed to perform real-time sync");
  }
}

/**
 * Check question for duplicates before saving
 */
export async function validateQuestionUniqueness(
  pageId: string,
  question: {
    question: string;
    answer?: string;
    options?: string[];
    type: string;
  }
): Promise<{
  isUnique: boolean;
  duplicateInfo: any;
  suggestions: string[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const duplicateCheck = await checkQuestionDuplicate(pageId, question);

    return {
      isUnique: !duplicateCheck.isDuplicate,
      duplicateInfo: duplicateCheck,
      suggestions: duplicateCheck.suggestions,
    };
  } catch (error) {
    console.error("Error validating question uniqueness:", error);
    throw new Error("Failed to validate question uniqueness");
  }
}

/**
 * Get comprehensive sync and processing analytics
 */
export async function getSyncAnalytics(
  accountId: string,
  days: number = 7
): Promise<{
  syncFrequency: {
    frequent: number; // syncs in last hour
    daily: number; // syncs in last day
    weekly: number; // syncs in last week
  };
  processingStats: {
    totalPages: number;
    processedPages: number;
    pendingPages: number;
    avgProcessingTime: number;
  };
  qualityMetrics: {
    avgQualityScore: number;
    duplicatesPreventedCount: number;
    uniquenessRate: number;
  };
  upcomingSyncs: Array<{
    pageId: string;
    title: string;
    nextSync: Date;
    priority: string;
  }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get processing statistics
    const processingStats = await getProcessingStats(accountId);

    // Get scheduling status
    const scheduleStatus = getUserSchedulingStatus(user.id);

    // Mock analytics data (in a real app, you'd query job history and logs)
    const analytics = {
      syncFrequency: {
        frequent: 12, // Mock: 12 syncs in last hour
        daily: 48, // Mock: 48 syncs in last day
        weekly: 300, // Mock: 300 syncs in last week
      },
      processingStats: {
        totalPages: processingStats.totalPages,
        processedPages: processingStats.processedPages,
        pendingPages: processingStats.pendingPages,
        avgProcessingTime: 2.5, // Mock: 2.5 seconds average
      },
      qualityMetrics: {
        avgQualityScore: 87.5, // Mock: 87.5% average quality
        duplicatesPreventedCount: 23, // Mock: 23 duplicates prevented
        uniquenessRate: 95.2, // Mock: 95.2% uniqueness rate
      },
      upcomingSyncs: scheduleStatus.nextSyncTimes.slice(0, 5).map(sync => ({
        pageId: sync.pageId,
        title: `Page ${sync.pageId.slice(0, 8)}...`, // Mock title
        nextSync: sync.nextSync,
        priority: sync.priority,
      })),
    };

    return analytics;
  } catch (error) {
    console.error("Error getting sync analytics:", error);
    throw new Error("Failed to get sync analytics");
  }
}

/**
 * Clear the job processing queue
 */
export async function clearProcessingQueue(
  userId?: string
): Promise<{ success: boolean; clearedCount: number; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { clearJobQueue } = await import("@/lib/jobs/simple-queue");

    // Use the current user's ID if no userId provided
    const targetUserId = userId || user.id;

    const result = await clearJobQueue(targetUserId);

    return {
      success: true,
      clearedCount: result.cleared,
      message: `Successfully cleared ${result.cleared} pending jobs from the queue`,
    };
  } catch (error) {
    console.error("Error clearing processing queue:", error);
    return {
      success: false,
      clearedCount: 0,
      message: "Failed to clear processing queue",
    };
  }
}

/**
 * Clear upcoming sync schedules
 */
export async function clearUpcomingSyncs(
  userId?: string
): Promise<{ success: boolean; clearedCount: number; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { clearAllUpcomingSyncs } = await import(
      "@/lib/scheduling/sync-scheduler"
    );

    // Use the current user's ID if no userId provided
    const targetUserId = userId || user.id;

    const result = clearAllUpcomingSyncs(targetUserId);

    return {
      success: true,
      clearedCount: result.clearedCount,
      message: `Successfully cleared ${result.clearedCount} upcoming sync schedules`,
    };
  } catch (error) {
    console.error("Error clearing upcoming syncs:", error);
    return {
      success: false,
      clearedCount: 0,
      message: "Failed to clear upcoming syncs",
    };
  }
}

/**
 * Clear both job queue and upcoming syncs
 */
export async function clearAllScheduledItems(userId?: string): Promise<{
  success: boolean;
  queueCleared: number;
  syncsCleared: number;
  message: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const [queueResult, syncsResult] = await Promise.all([
      clearProcessingQueue(userId),
      clearUpcomingSyncs(userId),
    ]);

    const totalCleared = queueResult.clearedCount + syncsResult.clearedCount;

    return {
      success: queueResult.success && syncsResult.success,
      queueCleared: queueResult.clearedCount,
      syncsCleared: syncsResult.clearedCount,
      message: `Successfully cleared ${queueResult.clearedCount} queued jobs and ${syncsResult.clearedCount} scheduled syncs (${totalCleared} total)`,
    };
  } catch (error) {
    console.error("Error clearing all scheduled items:", error);
    return {
      success: false,
      queueCleared: 0,
      syncsCleared: 0,
      message: "Failed to clear scheduled items",
    };
  }
}

/**
 * Get real-time job activity for activity feed
 */
export async function getRealtimeJobActivity(limit: number = 20): Promise<{
  success: boolean;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    pageId?: string;
    jobId: string;
    status: string;
    triggerType: string;
    duration?: number;
  }>;
  debug?: any;
}> {
  console.log("🔍 getRealtimeJobActivity called with limit:", limit);

  const user = await getCurrentUser();
  if (!user) {
    console.log("❌ No user found in getRealtimeJobActivity");
    throw new Error("Unauthorized");
  }

  console.log("✅ User found:", user.id, user.email);

  try {
    const { getJobHistoryByUser } = await import(
      "@/lib/db/queries/job-history"
    );
    console.log("📦 Imported getJobHistoryByUser function");

    const jobs = await getJobHistoryByUser(user.id, limit, 0);
    console.log("📊 Raw jobs from database:", jobs.length, "jobs found");

    if (jobs.length === 0) {
      console.log("⚠️ No jobs found in database for user:", user.id);
      return {
        success: true,
        activities: [],
        debug: {
          userId: user.id,
          jobCount: 0,
          message: "No jobs found in database",
        },
      };
    }

    console.log(
      "🔄 Processing jobs:",
      jobs.map(j => ({
        jobId: j.jobId,
        type: j.jobType,
        status: j.status,
        createdAt: j.createdAt,
      }))
    );

    const activities = jobs.map(job => {
      // Map job types to user-friendly activity types
      let activityType = "task_created";
      let title = "Task Created";
      let description = "Background task initiated";

      switch (job.jobType) {
        case "generate-questions":
          if (job.status === "created") {
            activityType = "task_created";
            title = "Question Generation Task";
            description = "AI question generation job queued";
          } else if (job.status === "active") {
            activityType = "questions_generating";
            title = "🤖 Generating Questions";
            description = "AI is analyzing content and creating questions";
          } else if (job.status === "completed") {
            activityType = "questions_generated";
            title = "✅ Questions Generated";
            description = `Generated ${job.result?.questionsCount || "multiple"} new questions`;
          } else if (job.status === "failed") {
            activityType = "task_failed";
            title = "❌ Question Generation Failed";
            description =
              job.error || "Question generation encountered an error";
          }
          break;

        case "sync-notion-account":
          if (job.status === "created") {
            activityType = "sync_started";
            title = "Notion Sync Initiated";
            description = "Preparing to sync Notion account data";
          } else if (job.status === "active") {
            activityType = "sync_running";
            title = "🔄 Syncing Notion Pages";
            description = "Fetching latest page content from Notion";
          } else if (job.status === "completed") {
            activityType = "sync_completed";
            title = "✅ Notion Sync Complete";
            const changesSynced = job.result?.changesSynced || 0;
            const totalPages = job.result?.pagesProcessed || "multiple";
            if (changesSynced === 0) {
              description = `Synced ${totalPages} pages - No changes detected, pipeline stopped`;
            } else {
              description = `Synced ${totalPages} pages with ${changesSynced} changes detected`;
            }
          } else if (job.status === "failed") {
            activityType = "sync_failed";
            title = "❌ Notion Sync Failed";
            description = job.error || "Sync operation encountered an error";
          }
          break;

        case "cleanup-old-questions":
          if (job.status === "completed") {
            activityType = "cleanup_completed";
            title = "🧹 Cleanup Complete";
            description = `Removed ${job.result?.cleanedCount || "old"} outdated questions`;
          }
          break;
      }

      return {
        id: job.jobId,
        type: activityType,
        title,
        description,
        timestamp: job.startedAt || job.createdAt,
        pageId:
          job.entityType === "page" ? job.entityId || undefined : undefined,
        jobId: job.jobId,
        status: job.status,
        triggerType: job.triggerType,
        duration: job.duration || undefined,
      };
    });

    console.log(
      "✨ Processed activities:",
      activities.length,
      "activities created"
    );

    return {
      success: true,
      activities: activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      debug: {
        userId: user.id,
        rawJobCount: jobs.length,
        processedActivityCount: activities.length,
      },
    };
  } catch (error) {
    console.error("💥 Error getting realtime job activity:", error);
    return {
      success: false,
      activities: [],
      debug: {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

/**
 * Get current process status for real-time monitoring
 */
export async function getProcessStatus(): Promise<{
  success: boolean;
  processes: Array<{
    name: string;
    status: "idle" | "running" | "completed";
    progress?: number;
    activeJobs: number;
    lastActivity?: Date;
  }>;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { getJobHistoryByUser } = await import(
      "@/lib/db/queries/job-history"
    );
    const recentJobs = await getJobHistoryByUser(user.id, 50, 0);

    // Analyze recent job activity to determine process status
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recentActiveJobs = recentJobs.filter(
      job => job.status === "active" || job.createdAt > fiveMinutesAgo
    );

    // Categorize jobs by type
    const questionJobs = recentActiveJobs.filter(
      job => job.jobType === "generate-questions"
    );
    const syncJobs = recentActiveJobs.filter(
      job => job.jobType === "sync-notion-account"
    );
    const cleanupJobs = recentActiveJobs.filter(
      job => job.jobType === "cleanup-old-questions"
    );
    const allActiveJobs = recentJobs.filter(job => job.status === "active");

    const processes = [
      {
        name: "Sync Timer",
        status: syncJobs.some(job => job.status === "active")
          ? ("running" as const)
          : ("idle" as const),
        progress: syncJobs.some(job => job.status === "active")
          ? Math.floor(Math.random() * 100)
          : undefined,
        activeJobs: syncJobs.filter(job => job.status === "active").length,
        lastActivity: syncJobs[0]?.startedAt || syncJobs[0]?.createdAt,
      },
      {
        name: "Queue Processing",
        status:
          allActiveJobs.length > 0 ? ("running" as const) : ("idle" as const),
        progress:
          allActiveJobs.length > 0
            ? Math.floor(Math.random() * 100)
            : undefined,
        activeJobs: allActiveJobs.length,
        lastActivity:
          allActiveJobs[0]?.startedAt || allActiveJobs[0]?.createdAt,
      },
      {
        name: "Question Generation",
        status: questionJobs.some(job => job.status === "active")
          ? ("running" as const)
          : ("idle" as const),
        progress: questionJobs.some(job => job.status === "active")
          ? Math.floor(Math.random() * 100)
          : undefined,
        activeJobs: questionJobs.filter(job => job.status === "active").length,
        lastActivity: questionJobs[0]?.startedAt || questionJobs[0]?.createdAt,
      },
      {
        name: "Content Analysis",
        status:
          syncJobs.some(job => job.status === "active") ||
          questionJobs.some(job => job.status === "active")
            ? ("running" as const)
            : ("idle" as const),
        progress:
          syncJobs.some(job => job.status === "active") ||
          questionJobs.some(job => job.status === "active")
            ? Math.floor(Math.random() * 100)
            : undefined,
        activeJobs:
          syncJobs.filter(job => job.status === "active").length +
          questionJobs.filter(job => job.status === "active").length,
        lastActivity:
          [...syncJobs, ...questionJobs][0]?.startedAt ||
          [...syncJobs, ...questionJobs][0]?.createdAt,
      },
    ];

    return {
      success: true,
      processes,
    };
  } catch (error) {
    console.error("Error getting process status:", error);
    return {
      success: false,
      processes: [],
    };
  }
}

/**
 * Test function to create sample job history entries for debugging
 */
export async function createTestJobActivity(): Promise<{
  success: boolean;
  message: string;
  jobsCreated: number;
}> {
  console.log("🧪 Creating test job activity entries...");

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { createJobHistory } = await import("@/lib/db/queries/job-history");

    const testJobs = [
      {
        userId: user.id,
        jobId: `test-sync-${Date.now()}`,
        jobType: "sync-notion-account",
        status: "completed",
        triggerType: "user",
        entityId: "test-account-1",
        entityType: "account",
        jobData: { testData: true },
        result: { pagesProcessed: 5, changesSynced: 2 },
      },
      {
        userId: user.id,
        jobId: `test-questions-${Date.now()}`,
        jobType: "generate-questions",
        status: "completed",
        triggerType: "user",
        entityId: "test-page-1",
        entityType: "page",
        jobData: { testData: true },
        result: { questionsCount: 3 },
      },
      {
        userId: user.id,
        jobId: `test-cleanup-${Date.now()}`,
        jobType: "cleanup-old-questions",
        status: "completed",
        triggerType: "scheduled",
        entityId: "test-page-2",
        entityType: "page",
        jobData: { testData: true },
        result: { cleanedCount: 2 },
      },
    ];

    let jobsCreated = 0;
    for (const job of testJobs) {
      await createJobHistory(job);
      jobsCreated++;
      console.log("✅ Created test job:", job.jobId, job.jobType, job.status);
    }

    console.log("🎉 Successfully created", jobsCreated, "test job entries");

    return {
      success: true,
      message: `Created ${jobsCreated} test job entries`,
      jobsCreated,
    };
  } catch (error) {
    console.error("💥 Error creating test job activity:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      jobsCreated: 0,
    };
  }
}

/**
 * Clean up test job activity entries
 */
export async function cleanupTestJobActivity(): Promise<{
  success: boolean;
  message: string;
  jobsDeleted: number;
}> {
  console.log("🧹 Cleaning up test job activity entries...");

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { db } = await import("@/lib/db/config");
    const { jobHistory } = await import("@/lib/db/schema/job-history");
    const { eq, and, like } = await import("drizzle-orm");

    // Delete all jobs that have test data
    const result = await db
      .delete(jobHistory)
      .where(
        and(eq(jobHistory.userId, user.id), like(jobHistory.jobId, "%test-%"))
      )
      .returning();

    const deletedCount = result.length;
    console.log("🗑️ Deleted", deletedCount, "test job entries");

    return {
      success: true,
      message: `Deleted ${deletedCount} test job entries`,
      jobsDeleted: deletedCount,
    };
  } catch (error) {
    console.error("💥 Error cleaning up test job activity:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      jobsDeleted: 0,
    };
  }
}

/**
 * Create a job history entry for sync process activity
 */
export async function createSyncProcessActivity(data: {
  accountId: string;
  syncResult: {
    changesSynced: number;
    processingTime: number;
  };
  changeDetection: {
    totalPages: number;
    changedPages: number;
  };
}): Promise<{
  success: boolean;
  message: string;
  jobId: string;
}> {
  console.log("📝 Creating sync process activity entry...");

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const { createJobHistory, updateJobHistory } = await import(
      "@/lib/db/queries/job-history"
    );

    const syncJobId = `sync-pipeline-${Date.now()}`;

    // Create the job entry
    const jobRecord = await createJobHistory({
      userId: user.id,
      jobId: syncJobId,
      jobType: "sync-notion-account",
      status: "completed",
      triggerType: "scheduled",
      entityId: data.accountId,
      entityType: "account",
      jobData: {
        pipelineTriggered: true,
        timerExpired: true,
      },
    });

    // Update with result data
    await updateJobHistory(syncJobId, {
      result: {
        pagesProcessed: data.changeDetection.totalPages,
        changesSynced: data.changeDetection.changedPages,
        processingTime: data.syncResult.processingTime,
        earlyStop: data.changeDetection.changedPages === 0,
      },
      completedAt: new Date(),
    });

    console.log("✅ Created sync process activity entry:", syncJobId);

    return {
      success: true,
      message: "Sync process activity recorded",
      jobId: syncJobId,
    };
  } catch (error) {
    console.error("💥 Error creating sync process activity:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      jobId: "",
    };
  }
}

/**
 * Diagnostic function to debug change detection issues
 */
export async function debugChangeDetection(accountId: string): Promise<{
  success: boolean;
  diagnostics: {
    totalPages: number;
    pagesAnalyzed: number;
    syncStatus: string;
    samplePageAnalysis?: {
      pageId: string;
      title: string;
      currentHashes: any;
      storedHashes: any;
      lastEditedTime: Date;
      lastSyncTime?: Date;
      hasChanges: boolean;
      changeDetails: any;
    };
  };
}> {
  console.log(
    "🔍 Starting change detection diagnostics for account:",
    accountId
  );

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Step 1: Force a fresh sync from Notion
    console.log("1️⃣ Forcing fresh sync from Notion...");
    const syncResult = await triggerRealTimeSync(accountId);
    console.log("Sync result:", syncResult);

    // Step 2: Get all pages for analysis
    const allPages = await getNotionPagesByAccountId(accountId);
    console.log("2️⃣ Found", allPages.length, "pages in database");

    if (allPages.length === 0) {
      return {
        success: true,
        diagnostics: {
          totalPages: 0,
          pagesAnalyzed: 0,
          syncStatus: "No pages found",
        },
      };
    }

    // Step 3: Analyze the first page in detail
    const samplePage = allPages[0];
    console.log("3️⃣ Analyzing sample page:", samplePage.id, samplePage.title);

    // Prepare current page data for change detection
    const currentPageData = {
      title: samplePage.title,
      content: samplePage.content,
      properties: samplePage.properties,
      lastEditedTime: samplePage.lastEditedTime,
    };

    // Generate current hashes
    const currentHashes = {
      content: generateContentHash(currentPageData.content),
      title: generateTitleHash(currentPageData.title),
      properties: generatePropertiesHash(currentPageData.properties),
    };

    // Get stored hashes
    const storedHashes = {
      content: samplePage.contentHash,
      title: samplePage.titleHash,
      properties: samplePage.propertiesHash,
      lastProcessed: samplePage.lastProcessedHash,
    };

    console.log("📊 Current hashes:", currentHashes);
    console.log("📁 Stored hashes:", storedHashes);

    // Check for changes
    const contentChanged =
      !storedHashes.content || currentHashes.content !== storedHashes.content;
    const titleChanged =
      !storedHashes.title || currentHashes.title !== storedHashes.title;
    const propertiesChanged =
      !storedHashes.properties ||
      currentHashes.properties !== storedHashes.properties;

    const hasChanges = contentChanged || titleChanged || propertiesChanged;

    console.log("🔍 Change analysis:");
    console.log("- Content changed:", contentChanged);
    console.log("- Title changed:", titleChanged);
    console.log("- Properties changed:", propertiesChanged);
    console.log("- Has changes:", hasChanges);

    // Run full change detection
    const changeResult = NotionChangeDetector.detectChanges(currentPageData, {
      contentHash: samplePage.contentHash,
      titleHash: samplePage.titleHash,
      propertiesHash: samplePage.propertiesHash,
      lastProcessedHash: samplePage.lastProcessedHash,
      lastProcessedAt: samplePage.lastProcessedAt,
      processingVersion: samplePage.processingVersion,
      lastEditedTime: samplePage.lastEditedTime,
    });

    console.log("🎯 Change detection result:", changeResult);

    return {
      success: true,
      diagnostics: {
        totalPages: allPages.length,
        pagesAnalyzed: 1,
        syncStatus: `Synced ${syncResult.changesSynced} changes`,
        samplePageAnalysis: {
          pageId: samplePage.id,
          title: samplePage.title,
          currentHashes,
          storedHashes,
          lastEditedTime: samplePage.lastEditedTime,
          lastSyncTime: samplePage.lastSyncedAt,
          hasChanges,
          changeDetails: changeResult,
        },
      },
    };
  } catch (error) {
    console.error("💥 Error in change detection diagnostics:", error);
    return {
      success: false,
      diagnostics: {
        totalPages: 0,
        pagesAnalyzed: 0,
        syncStatus: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}
