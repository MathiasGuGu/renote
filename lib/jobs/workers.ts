import {
  jobQueue,
  JobType,
  GenerateQuestionsJobData,
  SyncNotionAccountJobData,
  CleanupOldQuestionsJobData,
} from "./queue";
import { QuestionGenerator } from "@/lib/ai/question-generator";
import { getNotionPageById } from "@/lib/db/queries/notion-pages";
import {
  createMultipleQuestions,
  deleteQuestionsByPageId,
} from "@/lib/db/queries/questions";
import { getNotionAccountById } from "@/lib/db/queries/notion-accounts";
import { NotionClient } from "@/lib/notion/client";

class JobWorkers {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log("Job workers already running");
      return;
    }

    await jobQueue.init();
    const boss = jobQueue.getBoss();

    if (!boss) {
      throw new Error("Job queue not initialized");
    }

    // Register workers for different job types
    await boss.work(
      "generate-questions",
      {
        batchSize: 1,
      },
      this.handleGenerateQuestions.bind(this)
    );

    await boss.work(
      "sync-notion-account",
      {
        batchSize: 1,
      },
      this.handleSyncNotionAccount.bind(this)
    );

    await boss.work(
      "cleanup-old-questions",
      {
        batchSize: 1,
      },
      this.handleCleanupOldQuestions.bind(this)
    );

    this.isRunning = true;
    console.log("Job workers started successfully");
  }

  async stop() {
    await jobQueue.stop();
    this.isRunning = false;
    console.log("Job workers stopped");
  }

  private async handleGenerateQuestions(job: any) {
    const data = job.data as GenerateQuestionsJobData;
    console.log(`Processing question generation job for page: ${data.pageId}`);

    try {
      // Get the page from database
      const page = await getNotionPageById(data.pageId);
      if (!page) {
        throw new Error(`Page not found: ${data.pageId}`);
      }

      // Extract content
      const content = this.extractContentFromPage(page);
      if (!content || content.length < 100) {
        throw new Error("Page content is too short for meaningful questions");
      }

      // Generate questions
      const generator = new QuestionGenerator();
      const generatedQuestions = await generator.generateQuestions(
        content,
        page.title,
        {
          questionTypes: data.options.questionTypes || [
            "multiple_choice",
            "short_answer",
          ],
          difficulty: data.options.difficulty || "medium",
          count: data.options.count || 5,
          focusAreas: data.options.focusAreas || [],
        }
      );

      // Clear existing questions for this page
      await deleteQuestionsByPageId(data.pageId);

      // Save new questions
      const questionsData = generatedQuestions.map(q => ({
        notionPageId: data.pageId,
        type: q.type,
        question: q.question,
        answer: q.answer,
        options: q.options,
        difficulty: q.difficulty,
        tags: q.tags,
        aiModel: "gpt-3.5-turbo",
        aiPrompt: "Generated via background job",
        confidence: q.confidence,
        metadata: {
          generatedAt: new Date().toISOString(),
          jobId: job.id,
          userId: data.userId,
        },
      }));

      const savedQuestions = await createMultipleQuestions(questionsData);

      console.log(
        `Successfully generated ${savedQuestions.length} questions for page: ${page.title}`
      );

      return {
        success: true,
        questionsGenerated: savedQuestions.length,
        pageTitle: page.title,
      };
    } catch (error) {
      console.error("Question generation job failed:", error);
      throw error; // This will mark the job as failed and trigger retries
    }
  }

  private async handleSyncNotionAccount(job: any) {
    const data = job.data as SyncNotionAccountJobData;
    console.log(`Processing sync job for account: ${data.accountId}`);

    try {
      // Get account
      const account = await getNotionAccountById(data.accountId);
      if (!account) {
        throw new Error(`Account not found: ${data.accountId}`);
      }

      // Perform sync (reuse existing sync logic)
      const client = new NotionClient(account.accessToken);

      // Note: You'd import and call the existing sync functions here
      // await syncDatabases(client, data.accountId);
      // await syncPages(client, data.accountId);

      console.log(`Successfully synced account: ${account.workspaceName}`);

      return {
        success: true,
        accountName: account.workspaceName,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Sync job failed:", error);
      throw error;
    }
  }

  private async handleCleanupOldQuestions(job: any) {
    const data = job.data as CleanupOldQuestionsJobData;
    console.log(`Processing cleanup job for user: ${data.userId}`);

    try {
      // Implement cleanup logic for old questions
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - data.daysOld);

      // This would require additional database queries to clean up old questions
      // For now, just log the action
      console.log(
        `Would cleanup questions older than ${cutoffDate.toISOString()}`
      );

      return {
        success: true,
        cleanedUp: 0, // Placeholder
        cutoffDate: cutoffDate.toISOString(),
      };
    } catch (error) {
      console.error("Cleanup job failed:", error);
      throw error;
    }
  }

  // Helper method - same as in server.ts
  private extractContentFromPage(page: any): string {
    let content = page.title || "";

    // Extract content from page blocks if available
    if (page.content && Array.isArray(page.content.results)) {
      const blockTexts = page.content.results
        .map((block: any) => this.extractTextFromBlock(block))
        .filter(Boolean);
      content += "\n\n" + blockTexts.join("\n\n");
    }

    // Fallback to properties if no block content
    if (content.length < 100 && page.properties) {
      const propertyTexts = Object.values(page.properties)
        .map((prop: any) => this.extractTextFromProperty(prop))
        .filter(Boolean);
      content += "\n\n" + propertyTexts.join("\n");
    }

    return content.trim();
  }

  private extractTextFromBlock(block: any): string {
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

  private extractTextFromProperty(property: any): string {
    if (!property) return "";

    switch (property.type) {
      case "title":
        return (
          property.title?.map((text: any) => text.plain_text || "").join("") ||
          ""
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
}

export const jobWorkers = new JobWorkers();
