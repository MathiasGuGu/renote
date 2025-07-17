// import { Worker, Job } from "bullmq";
// import {
//   EnhancedJobData,
//   JobResult,
//   JobType,
//   QUEUE_NAMES,
//   UserConcurrencyManager
// } from "./queue";
// import {
//   createNotionSyncEngine,
//   runNotionSync
// } from "../pipeline/notion-sync-engine";
// import { SyncLogger } from "../pipeline/sync-utilities";
// import {
//   SyncError,
//   NotionAPIError,
//   ContentProcessingError
// } from "@/lib/errors/sync-errors";
// import { getUserIdByClerkId } from "@/lib/data/queries/id-utility-queries";
// import IORedis from "ioredis";

// /**
//  * Get Redis connection for workers
//  */
// function getRedisConnection(): IORedis {
//   const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
//   return new IORedis(redisUrl, {
//     maxRetriesPerRequest: null, // BullMQ requirement - must be null
//     lazyConnect: true
//   });
// }

// /**
//  * Get error message safely for job results
//  */
// function getErrorMessage(error: unknown): string {
//   if (error instanceof Error) {
//     return error.message;
//   }
//   if (typeof error === 'string') {
//     return error;
//   }
//   return 'Unknown error occurred';
// }

// /**
//  * Base worker class with common functionality
//  */
// abstract class BaseWorker {
//   protected logger: SyncLogger;
//   protected worker: Worker;

//   constructor(queueName: string, workerName: string) {
//     this.logger = new SyncLogger(workerName, 'system');
//     this.worker = this.createWorker(queueName);
//     this.setupEventHandlers();
//   }

//   protected abstract processJob(job: Job<EnhancedJobData>): Promise<JobResult>;

//   private createWorker(queueName: string): Worker {
//     return new Worker(
//       queueName,
//       async (job: Job<EnhancedJobData>) => {
//         const startTime = Date.now();

//         try {
//           // Validate job data
//           this.validateJobData(job.data);

//           // Process the job
//           const result = await this.processJob(job);

//           // Calculate duration
//           const duration = Date.now() - startTime;
//           result.duration = duration;

//           // Log success
//           this.logger.info(`Job ${job.id} completed successfully`, {
//             type: job.data.type,
//             userId: job.data.userId,
//             duration
//           });

//           return result;

//         } catch (error) {
//           const duration = Date.now() - startTime;

//           // Create error result
//           const errorResult: JobResult = {
//             success: false,
//             jobId: job.id as string,
//             duration,
//             error: {
//               message: getErrorMessage(error),
//               code: error instanceof SyncError ? error.code : 'UNKNOWN_ERROR',
//               recoverable: error instanceof SyncError ? error.recoverable : false
//             }
//           };

//           // Log error
//           this.logger.error(`Job ${job.id} failed`, error as Error, {
//             type: job.data.type,
//             userId: job.data.userId,
//             duration
//           });

//           // Release locks if needed
//           await this.cleanupJob(job.data);

//           throw error;
//         }
//       },
//       {
//         concurrency: this.getConcurrency(),
//         limiter: this.getRateLimiter(),
//         connection: getRedisConnection()
//       }
//     );
//   }

//   private setupEventHandlers(): void {
//     this.worker.on('completed', (job, result: JobResult) => {
//       this.logger.info(`Worker completed job ${job.id}`, {
//         type: job.data.type,
//         duration: result.duration
//       });

//       // Schedule next jobs if specified
//       if (result.nextJobs) {
//         this.scheduleNextJobs(job.data.userId, result.nextJobs);
//       }

//       // Release locks
//       this.cleanupJob(job.data);
//     });

//     this.worker.on('failed', (job, err) => {
//       if (job) {
//         this.logger.error(`Worker failed job ${job.id}`, err, {
//           type: job.data.type,
//           userId: job.data.userId
//         });

//         // Release locks
//         this.cleanupJob(job.data);
//       }
//     });

//     this.worker.on('error', (err) => {
//       this.logger.error('Worker error', err);
//     });
//   }

//   private validateJobData(data: EnhancedJobData): void {
//     if (!data.userId || !data.clerkId || !data.type) {
//       throw new SyncError('Invalid job data: missing required fields', 'INVALID_JOB_DATA');
//     }
//   }

//   private async cleanupJob(data: EnhancedJobData): Promise<void> {
//     // Release user concurrency locks
//     if (this.isSyncJob(data.type)) {
//       await UserConcurrencyManager.releaseLock(data.userId, data.type);
//     }
//   }

//   private isSyncJob(type: JobType): boolean {
//     return type.includes('sync-notion');
//   }

//   private async scheduleNextJobs(
//     userId: string,
//     nextJobs: Array<{ type: JobType; priority: any; delay?: number }>
//   ): Promise<void> {
//     for (const nextJob of nextJobs) {
//       try {
//         // This would need to be implemented with proper job scheduling
//         this.logger.info(`Scheduling next job: ${nextJob.type}`, {
//           userId,
//           delay: nextJob.delay
//         });
//       } catch (error) {
//         this.logger.error(`Failed to schedule next job: ${nextJob.type}`, error as Error);
//       }
//     }
//   }

//   protected abstract getConcurrency(): number;
//   protected abstract getRateLimiter(): { max: number; duration: number };

//   async close(): Promise<void> {
//     await this.worker.close();
//   }
// }

// /**
//  * Sync worker for handling Notion synchronization jobs
//  */
// export class SyncWorker extends BaseWorker {
//   constructor() {
//     super(QUEUE_NAMES.SYNC_URGENT, 'SyncWorker');
//   }

//   protected async processJob(job: Job<EnhancedJobData>): Promise<JobResult> {
//     const { userId, clerkId, type, metadata } = job.data;

//     this.logger.info(`Processing sync job`, {
//       jobId: job.id,
//       type,
//       userId,
//       triggeredBy: metadata.triggeredBy
//     });

//     try {
//       let result;

//       switch (type) {
//         case 'sync-notion-initial':
//         case 'sync-notion-incremental':
//         case 'sync-notion-manual':
//           result = await this.processSyncJob(clerkId, metadata);
//           break;
//         default:
//           throw new SyncError(`Unknown sync job type: ${type}`, 'UNKNOWN_JOB_TYPE');
//       }

//       return {
//         success: true,
//         jobId: job.id as string,
//         duration: 0, // Will be set by base class
//         results: result,
//         nextJobs: this.getNextJobs(type, result),
//         notification: this.createSuccessNotification(type, result)
//       };

//     } catch (error) {
//       throw new ContentProcessingError(`Sync job failed: ${getErrorMessage(error)}`);
//     }
//   }

//   private async processSyncJob(
//     clerkId: string,
//     metadata: EnhancedJobData['metadata']
//   ): Promise<any> {
//     try {
//       // Use the enhanced sync engine
//       const syncResult = await runNotionSync(clerkId, {
//         enableContentProcessing: metadata.contentProcessing?.enableAI ?? true,
//         maxContentLength: 100000
//       });

//       if (!syncResult.success) {
//         throw new ContentProcessingError(
//           syncResult.error?.message || 'Sync failed'
//         );
//       }

//       return {
//         pagesSynced: syncResult.metrics.pagesSynced,
//         databasesSynced: syncResult.metrics.databasesSynced,
//         contentProcessed: syncResult.learningContent.pagesReady
//       };

//     } catch (error) {
//       this.logger.error('Sync engine execution failed', error as Error);
//       throw error;
//     }
//   }

//   private getNextJobs(type: JobType, result: any): Array<{ type: JobType; priority: any; delay?: number }> {
//     const nextJobs = [];

//     // After successful sync, trigger content processing
//     if (result.pagesSynced > 0 || result.contentProcessed > 0) {
//       nextJobs.push({
//         type: 'process-content' as JobType,
//         priority: 50, // Medium priority
//         delay: 1000 // 1 second delay
//       });
//     }

//     return nextJobs;
//   }

//   private createSuccessNotification(type: JobType, result: any): any {
//     return {
//       title: 'Sync Complete',
//       message: `Synced ${result.pagesSynced} pages and ${result.databasesSynced} databases`,
//       type: 'success' as const,
//       actions: [
//         {
//           label: 'View Learning Content',
//           action: 'navigate-to-dashboard'
//         }
//       ]
//     };
//   }

//   protected getConcurrency(): number {
//     return 3; // Process 3 sync jobs concurrently
//   }

//   protected getRateLimiter(): { max: number; duration: number } {
//     return {
//       max: 10,   // Max 10 sync jobs
//       duration: 60000 // Per minute
//     };
//   }
// }

// /**
//  * Scheduled sync worker for background synchronization
//  */
// export class ScheduledSyncWorker extends BaseWorker {
//   constructor() {
//     super(QUEUE_NAMES.SYNC_SCHEDULED, 'ScheduledSyncWorker');
//   }

//   protected async processJob(job: Job<EnhancedJobData>): Promise<JobResult> {
//     // Similar to SyncWorker but with different priorities and handling
//     return this.processSyncJob(job);
//   }

//   private async processSyncJob(job: Job<EnhancedJobData>): Promise<JobResult> {
//     const { clerkId, type } = job.data;

//     try {
//       const syncResult = await runNotionSync(clerkId, {
//         enableContentProcessing: true,
//         maxContentLength: 50000 // Smaller limit for background syncs
//       });

//       return {
//         success: syncResult.success,
//         jobId: job.id as string,
//         duration: 0,
//         results: {
//           pagesSynced: syncResult.metrics.pagesSynced,
//           databasesSynced: syncResult.metrics.databasesSynced
//         },
//         // Don't notify user for background syncs unless there's an error
//         notification: syncResult.success ? undefined : {
//           title: 'Background Sync Issue',
//           message: 'Please check your Notion connection',
//           type: 'warning' as const
//         }
//       };

//     } catch (error) {
//       throw new ContentProcessingError(`Scheduled sync failed: ${getErrorMessage(error)}`);
//     }
//   }

//   protected getConcurrency(): number {
//     return 2; // Lower concurrency for background jobs
//   }

//   protected getRateLimiter(): { max: number; duration: number } {
//     return {
//       max: 20,     // More jobs allowed
//       duration: 60000 // Per minute
//     };
//   }
// }

// /**
//  * Content processing worker for learning material generation
//  */
// export class ContentProcessingWorker extends BaseWorker {
//   constructor() {
//     super(QUEUE_NAMES.CONTENT_PROCESSING, 'ContentProcessingWorker');
//   }

//   protected async processJob(job: Job<EnhancedJobData>): Promise<JobResult> {
//     const { userId, type, metadata } = job.data;

//     this.logger.info(`Processing content job`, {
//       jobId: job.id,
//       type,
//       userId
//     });

//     try {
//       let result;

//       switch (type) {
//         case 'process-content':
//           result = await this.processContentForLearning(userId);
//           break;
//         default:
//           throw new SyncError(`Unknown content job type: ${type}`, 'UNKNOWN_JOB_TYPE');
//       }

//       return {
//         success: true,
//         jobId: job.id as string,
//         duration: 0,
//         results: result,
//         nextJobs: [{
//           type: 'generate-questions' as JobType,
//           priority: 50,
//           delay: 2000
//         }]
//       };

//     } catch (error) {
//       throw new ContentProcessingError(`Content processing failed: ${getErrorMessage(error)}`);
//     }
//   }

//   private async processContentForLearning(userId: string): Promise<any> {
//     // TODO: Implement actual content processing
//     // This would analyze synced content for learning readiness

//     this.logger.info(`Processing content for learning generation`, { userId });

//     // Mock implementation
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     return {
//       contentProcessed: 10,
//       learningContentReady: 8
//     };
//   }

//   protected getConcurrency(): number {
//     return 5; // More concurrent processing jobs
//   }

//   protected getRateLimiter(): { max: number; duration: number } {
//     return {
//       max: 50,     // Higher limit for processing
//       duration: 60000
//     };
//   }
// }

// /**
//  * Learning generation worker for AI-powered question creation
//  */
// export class LearningGenerationWorker extends BaseWorker {
//   constructor() {
//     super(QUEUE_NAMES.LEARNING_GENERATION, 'LearningGenerationWorker');
//   }

//   protected async processJob(job: Job<EnhancedJobData>): Promise<JobResult> {
//     const { userId, type, metadata } = job.data;

//     this.logger.info(`Processing learning generation job`, {
//       jobId: job.id,
//       type,
//       userId
//     });

//     try {
//       let result;

//       switch (type) {
//         case 'generate-questions':
//           result = await this.generateQuestions(userId);
//           break;
//         case 'update-learning-path':
//           result = await this.updateLearningPath(userId);
//           break;
//         default:
//           throw new SyncError(`Unknown learning job type: ${type}`, 'UNKNOWN_JOB_TYPE');
//       }

//       return {
//         success: true,
//         jobId: job.id as string,
//         duration: 0,
//         results: result,
//         notification: {
//           title: 'Learning Content Ready',
//           message: `Generated ${result.questionsGenerated} new questions`,
//           type: 'success' as const,
//           actions: [{
//             label: 'Start Learning',
//             action: 'navigate-to-questions'
//           }]
//         }
//       };

//     } catch (error) {
//       throw new ContentProcessingError(`Learning generation failed: ${getErrorMessage(error)}`);
//     }
//   }

//   private async generateQuestions(userId: string): Promise<any> {
//     // TODO: Implement AI question generation
//     // This would use OpenAI to create questions from synced content

//     this.logger.info(`Generating questions for user`, { userId });

//     // Mock implementation
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     return {
//       questionsGenerated: 15,
//       difficultyLevels: ['easy', 'medium', 'hard'],
//       topicsCovered: ['database-design', 'authentication', 'api-design']
//     };
//   }

//   private async updateLearningPath(userId: string): Promise<any> {
//     // TODO: Implement adaptive learning path updates

//     this.logger.info(`Updating learning path for user`, { userId });

//     // Mock implementation
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     return {
//       pathUpdated: true,
//       nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
//     };
//   }

//   protected getConcurrency(): number {
//     return 3; // Limited by AI API rate limits
//   }

//   protected getRateLimiter(): { max: number; duration: number } {
//     return {
//       max: 30,     // Limited by OpenAI rate limits
//       duration: 60000
//     };
//   }
// }

// /**
//  * Worker manager to coordinate all workers
//  */
// export class WorkerManager {
//   private static workers: BaseWorker[] = [];
//   private static logger = new SyncLogger('WorkerManager', 'system');

//   static async startAllWorkers(): Promise<void> {
//     this.logger.info('Starting all queue workers');

//     try {
//       this.workers = [
//         new SyncWorker(),
//         new ScheduledSyncWorker(),
//         new ContentProcessingWorker(),
//         new LearningGenerationWorker()
//       ];

//       this.logger.info(`Started ${this.workers.length} workers`);
//     } catch (error) {
//       this.logger.error('Failed to start workers', error as Error);
//       throw error;
//     }
//   }

//   static async stopAllWorkers(): Promise<void> {
//     this.logger.info('Stopping all queue workers');

//     try {
//       await Promise.all(this.workers.map(worker => worker.close()));
//       this.workers = [];

//       this.logger.info('All workers stopped');
//     } catch (error) {
//       this.logger.error('Error stopping workers', error as Error);
//       throw error;
//     }
//   }

//   static getWorkerCount(): number {
//     return this.workers.length;
//   }
// }
