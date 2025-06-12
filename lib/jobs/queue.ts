import PgBoss from "pg-boss";

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

class JobQueue {
  private boss: PgBoss | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for job queue");
    }

    console.log("Initializing pg-boss with database...");

    this.boss = new PgBoss({
      connectionString,
      retryBackoff: true,
      retryLimit: 3,
    });

    try {
      await this.boss.start();
      this.initialized = true;
      console.log("Job queue initialized successfully");
    } catch (error) {
      console.error("Failed to start pg-boss:", error);
      throw error;
    }
  }

  async enqueue<T extends JobData>(
    name: JobType,
    data: T,
    options: {
      priority?: number;
      delay?: number;
      retryLimit?: number;
      expireInSeconds?: number;
    } = {}
  ): Promise<string | null> {
    if (!this.boss) {
      throw new Error("Job queue not initialized");
    }

    if (!this.initialized) {
      throw new Error("Job queue not started");
    }

    console.log(`Attempting to enqueue job: ${name}`, { data, options });

    try {
      const jobOptions = {
        priority: options.priority || 0,
        startAfter: options.delay
          ? new Date(Date.now() + options.delay * 1000)
          : undefined,
        retryLimit: options.retryLimit || 3,
        expireInSeconds: options.expireInSeconds || 3600, // 1 hour default
      };

      console.log("Job options:", jobOptions);

      const jobId = await this.boss.send(name, data, jobOptions);

      if (!jobId) {
        console.error("pg-boss.send() returned null/undefined");
        console.error("Boss state:", {
          isStarted: this.boss && typeof this.boss.send === "function",
          connectionString: process.env.DATABASE_URL ? "present" : "missing",
        });
        throw new Error("pg-boss failed to create job - returned null");
      }

      console.log(`Successfully enqueued job ${name} with ID: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error(`Failed to enqueue job ${name}:`, error);
      throw error;
    }
  }

  async getJobs(name?: JobType, limit = 50, offset = 0) {
    if (!this.boss) {
      throw new Error("Job queue not initialized");
    }

    // Note: pg-boss doesn't have a direct way to query all jobs by type
    // This is a simplified implementation
    return [];
  }

  // Note: cancelJob and scheduleRecurring methods temporarily removed due to pg-boss API compatibility issues

  async stop() {
    if (this.boss) {
      await this.boss.stop();
      this.initialized = false;
      console.log("Job queue stopped");
    }
  }

  getBoss() {
    return this.boss;
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Job status enum for tracking
export enum JobStatus {
  CREATED = "created",
  RETRY = "retry",
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  FAILED = "failed",
}
