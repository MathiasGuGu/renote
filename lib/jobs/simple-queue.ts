import { db } from "@/lib/db/config";
import { jobHistory } from "@/lib/db/schema/job-history";
import {
  createJobHistory,
  updateJobHistory,
  getJobHistoryByUser,
} from "@/lib/db/queries/job-history";
import { eq, and, asc, or, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export type JobType =
  | "generate-questions"
  | "sync-notion-account"
  | "cleanup-old-questions";

export interface GenerateQuestionsJobData {
  pageId: string;
  userId: string;
  options: {
    questionTypes?: string[];
    difficulty?: string;
    count?: number;
    focusAreas?: string[];
  };
}

export interface SyncNotionAccountJobData {
  accountId: string;
  userId: string;
  force?: boolean;
}

export interface CleanupOldQuestionsJobData {
  userId: string;
  daysOld: number;
}

export type JobData =
  | GenerateQuestionsJobData
  | SyncNotionAccountJobData
  | CleanupOldQuestionsJobData;

export enum JobStatus {
  CREATED = "created",
  RETRY = "retry",
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

class SimpleJobQueue {
  private workers: Map<JobType, (data: any) => Promise<any>> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private lastJobCount = 0;
  private adaptiveInterval = 30000; // Start with 30 seconds

  constructor() {
    // Don't auto-start processing - use lazy initialization instead
    // this.startProcessing();
  }

  // Register a worker function for a job type
  registerWorker<T extends JobData>(
    jobType: JobType,
    worker: (data: T) => Promise<any>
  ) {
    this.workers.set(jobType, worker);
    console.log(`Registered worker for job type: ${jobType}`);
  }

  // Enqueue a new job
  async enqueue<T extends JobData>(
    name: JobType,
    data: T,
    options: {
      priority?: number;
      triggerType?: "user" | "scheduled" | "bulk";
      delay?: number;
      retryLimit?: number;
      expireInSeconds?: number;
    } = {}
  ): Promise<string> {
    // Lazy initialization - start processing when first job is enqueued
    if (!this.isProcessing) {
      this.startProcessing();
    }

    const jobId = uuidv4();

    // Priority mapping: user-triggered > scheduled > bulk processing
    let priority = options.priority;
    if (!priority) {
      switch (options.triggerType || "user") {
        case "user":
          priority = 1; // Highest priority
          break;
        case "scheduled":
          priority = 5; // Medium priority
          break;
        case "bulk":
          priority = 9; // Lower priority
          break;
      }
    }

    try {
      await createJobHistory({
        userId: data.userId,
        jobId,
        jobType: name,
        status: JobStatus.CREATED,
        priority,
        triggerType: options.triggerType || "user",
        entityId:
          "pageId" in data
            ? data.pageId
            : "accountId" in data
              ? data.accountId
              : undefined,
        entityType:
          "pageId" in data
            ? "page"
            : "accountId" in data
              ? "account"
              : undefined,
        jobData: data,
        maxRetries: options.retryLimit || 3,
      });

      console.log(
        `Enqueued ${options.triggerType || "user"}-triggered job ${name} (priority ${priority}) with ID: ${jobId}`
      );

      // Trigger immediate processing for user jobs to improve responsiveness
      if (options.triggerType === "user" || !options.triggerType) {
        this.triggerImmediateProcessing();
      }

      return jobId;
    } catch (error) {
      console.error(`Failed to enqueue job ${name}:`, error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: string, userId: string) {
    try {
      const history = await getJobHistoryByUser(userId, 100, 0);
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
      throw error;
    }
  }

  // Start processing jobs
  startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log("Starting adaptive job queue processing...");

    // Use adaptive processing - frequent when there are jobs, less frequent when idle
    this.scheduleNextProcessing();
  }

  // Ensure processing is started (can be called safely multiple times)
  ensureProcessing() {
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  private scheduleNextProcessing() {
    if (!this.isProcessing) return;

    this.processingInterval = setTimeout(() => {
      this.processJobs()
        .catch(error => {
          console.error("Error processing jobs:", error);
        })
        .finally(() => {
          // Schedule the next processing cycle
          this.scheduleNextProcessing();
        });
    }, this.adaptiveInterval);
  }

  private triggerImmediateProcessing() {
    if (!this.isProcessing) return;

    // Cancel the current timeout and process immediately
    if (this.processingInterval) {
      clearTimeout(this.processingInterval);
      this.processingInterval = null;
    }

    // Process jobs immediately, then resume normal scheduling
    this.processJobs()
      .catch(error => {
        console.error("Error in immediate processing:", error);
      })
      .finally(() => {
        this.scheduleNextProcessing();
      });
  }

  // Stop processing jobs
  stopProcessing() {
    if (this.processingInterval) {
      clearTimeout(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log("Stopped adaptive job queue processing");
  }

  // Clear all pending jobs from the queue
  async clearQueue(userId?: string): Promise<{ cleared: number }> {
    try {
      const { updateJobHistory } = await import("../db/queries/job-history");

      let whereCondition;
      if (userId) {
        whereCondition = and(
          eq(jobHistory.userId, userId),
          or(
            eq(jobHistory.status, JobStatus.CREATED),
            eq(jobHistory.status, JobStatus.RETRY)
          )
        );
      } else {
        whereCondition = or(
          eq(jobHistory.status, JobStatus.CREATED),
          eq(jobHistory.status, JobStatus.RETRY)
        );
      }

      // Get pending jobs to count them
      const pendingJobs = await db
        .select()
        .from(jobHistory)
        .where(whereCondition);

      // Cancel all pending jobs
      for (const job of pendingJobs) {
        await updateJobHistory(job.jobId, {
          status: JobStatus.CANCELLED,
          completedAt: new Date(),
          error: "Job cancelled due to queue clear operation",
        });
      }

      const clearedCount = pendingJobs.length;
      console.log(
        `Cleared ${clearedCount} pending jobs from queue${userId ? ` for user ${userId}` : ""}`
      );

      return { cleared: clearedCount };
    } catch (error) {
      console.error("Error clearing job queue:", error);
      throw new Error("Failed to clear job queue");
    }
  }

  // Process pending jobs
  private async processJobs() {
    // Ensure workers are initialized before processing
    await ensureWorkersInitialized();

    try {
      // Get pending jobs from database, ordered by priority (1=highest, 10=lowest)
      const pendingJobs = await db
        .select()
        .from(jobHistory)
        .where(
          or(
            eq(jobHistory.status, JobStatus.CREATED),
            and(
              eq(jobHistory.status, JobStatus.RETRY),
              lt(jobHistory.nextRetryAt, new Date())
            )
          )
        )
        .orderBy(asc(jobHistory.priority), asc(jobHistory.createdAt))
        .limit(2); // Process even fewer jobs at once for better responsiveness

      // Adaptive interval based on job activity
      const currentJobCount = pendingJobs.length;

      if (currentJobCount > 0) {
        // Jobs available - check more frequently (every 10 seconds)
        this.adaptiveInterval = 10000;
        console.log(`Processing ${currentJobCount} pending jobs`);
      } else if (this.lastJobCount > 0 && currentJobCount === 0) {
        // Just finished processing all jobs - check moderately (every 30 seconds)
        this.adaptiveInterval = 30000;
        console.log("Queue is now empty, switching to moderate polling");
      } else {
        // No jobs for multiple cycles - check infrequently (every 2 minutes)
        this.adaptiveInterval = Math.min(this.adaptiveInterval * 1.2, 120000);
      }

      this.lastJobCount = currentJobCount;

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
      // On error, back off a bit
      this.adaptiveInterval = Math.min(this.adaptiveInterval * 1.5, 120000);
    }
  }

  // Process a single job
  private async processJob(job: any) {
    const worker = this.workers.get(job.jobType as JobType);

    if (!worker) {
      console.warn(`No worker registered for job type: ${job.jobType}`);
      await updateJobHistory(job.jobId, {
        status: JobStatus.FAILED,
        error: `No worker registered for job type: ${job.jobType}`,
        completedAt: new Date(),
      });
      return;
    }

    try {
      console.log(
        `Processing ${job.triggerType || "user"}-triggered job ${job.jobType} (priority ${job.priority || 5}) with ID: ${job.jobId}`
      );

      // Apply rate limiting based on job type
      const { rateLimiter } = await import("./rate-limiter");
      let rateLimitService = "general";

      if (job.jobType === "generate-questions") {
        rateLimitService = "openai";
      } else if (job.jobType === "sync-notion-account") {
        rateLimitService = "notion";
      } else if (job.triggerType === "bulk") {
        rateLimitService = "bulk";
      }

      // Wait for rate limit clearance
      await rateLimiter.waitForLimit(rateLimitService);

      // Mark job as active
      await updateJobHistory(job.jobId, {
        status: JobStatus.ACTIVE,
        startedAt: new Date(),
      });

      // Record the API request
      rateLimiter.recordRequest(rateLimitService);

      // Execute the job
      const result = await worker(job.jobData);

      // Mark job as completed
      await updateJobHistory(job.jobId, {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        duration: Math.floor(
          (Date.now() - new Date(job.createdAt).getTime()) / 1000
        ),
      });

      console.log(`Completed job ${job.jobType} with ID: ${job.jobId}`);
    } catch (error) {
      console.error(`Failed to process job ${job.jobId}:`, error);

      const retryCount = (job.retryCount || 0) + 1;
      const maxRetries = job.maxRetries || 3;

      if (retryCount <= maxRetries) {
        // Calculate exponential backoff delay (2^retryCount minutes)
        const delayMinutes = Math.pow(2, retryCount);
        const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        console.log(
          `Retrying job ${job.jobId} in ${delayMinutes} minutes (attempt ${retryCount}/${maxRetries})`
        );

        await updateJobHistory(job.jobId, {
          status: JobStatus.RETRY,
          error: error instanceof Error ? error.message : "Unknown error",
          retryCount,
          nextRetryAt,
        });
      } else {
        // Max retries exceeded, mark as failed
        console.log(`Job ${job.jobId} failed after ${maxRetries} attempts`);

        await updateJobHistory(job.jobId, {
          status: JobStatus.FAILED,
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
          retryCount,
        });
      }
    }
  }
}

// Singleton instance
export const simpleJobQueue = new SimpleJobQueue();

// Initialize workers lazily on first use to prevent multiple instances
let workersInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureWorkersInitialized() {
  if (workersInitialized) return;

  // If already initializing, wait for it to complete
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      const { simpleJobWorkers } = await import("./simple-workers");
      await simpleJobWorkers.start();
      workersInitialized = true;
      console.log("Background job workers initialized");
    } catch (error) {
      console.error("Failed to initialize background job workers:", error);
      // Reset the promise so it can be retried
      initializationPromise = null;
      throw error;
    }
  })();

  await initializationPromise;
}

// Convenience functions for easier use
export const addJob = <T extends JobData>(
  jobType: JobType,
  data: T,
  options?: {
    priority?: number;
    triggerType?: "user" | "scheduled" | "bulk";
    delay?: number;
    retryLimit?: number;
    expireInSeconds?: number;
  }
): Promise<string> => {
  return simpleJobQueue.enqueue(jobType, data, options);
};

export const getJobStatus = (jobId: string, userId: string) => {
  return simpleJobQueue.getJobStatus(jobId, userId);
};

export const clearJobQueue = (userId?: string) => {
  return simpleJobQueue.clearQueue(userId);
};

export const getJobs = async (status: string, limit: number = 10) => {
  // This function would need to query the database directly
  // For now, let's use the job history queries
  const { getJobHistoryByStatus } = await import("../db/queries/job-history");
  return getJobHistoryByStatus(status as any, limit);
};

// Export method to manually ensure processing is started
export const ensureJobProcessing = () => {
  simpleJobQueue.ensureProcessing();
};
