// import { Queue, Worker, QueueEvents } from "bullmq";
// import { Redis } from "ioredis";
// import { runNotionSync } from "../pipeline/notion-sync-example";

// // Redis connection configuration
// let connection: Redis | null = null;

// function getRedisConnection() {
//   if (connection?.status === "ready") {
//     return connection;
//   }

//   if (!process.env.REDIS_URL) {
//     throw new Error("REDIS_URL environment variable is required");
//   }

//   // Validate Redis URL format
//   const redisUrl = process.env.REDIS_URL;
//   if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
//     throw new Error("REDIS_URL must start with redis:// or rediss://");
//   }

//   connection = new Redis(redisUrl, {
//     maxRetriesPerRequest: null,
//     retryStrategy: times => {
//       if (times > 3) {
//         console.error("Redis connection failed after 3 retries");
//         return null; // Stop retrying after 3 attempts
//       }
//       const delay = Math.min(times * 50, 2000);
//       console.log(
//         `Redis connection retry attempt ${times} with delay ${delay}ms`
//       );
//       return delay;
//     },
//     reconnectOnError: err => {
//       const targetError = "READONLY";
//       if (err.message.includes(targetError)) {
//         console.warn("Redis READONLY error detected, attempting reconnect");
//         return true;
//       }
//       console.error("Redis error not eligible for reconnect:", err.message);
//       return false;
//     },
//   });

//   // Enhanced Redis event logging
//   connection.on("error", err => {
//     if (err.name === "ECONNRESET") {
//       console.warn("Redis connection reset, will reconnect...");
//       return;
//     }
//     console.error("Redis connection error:", {
//       name: err.name,
//       message: err.message,
//       stack: err.stack,
//     });
//   });

//   connection.on("connect", () => {
//     console.log("Redis connection established");
//   });

//   connection.on("ready", () => {
//     console.log("Redis connection ready for operations");
//   });

//   connection.on("reconnecting", () => {
//     console.log("Redis reconnecting...");
//   });

//   connection.on("close", () => {
//     console.warn("Redis connection closed");
//   });

//   connection.on("end", () => {
//     console.warn("Redis connection ended");
//   });

//   return connection;
// }

// // Queue names
// export const QUEUE_NAMES = {
//   SYNC_PIPELINE: "sync-pipeline",
// } as const;

// // Queue types
// export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// // Job types for the sync pipeline
// export type SyncJobType =
//   | "sync-notion" // Initial sync from Notion
//   | "process-content" // Process synced content
//   | "generate-questions"; // Generate questions from content

// // Job data types
// export interface SyncJobData {
//   userId: string;
//   accountId: string;
//   type: SyncJobType;
//   metadata?: {
//     pageId?: string;
//     databaseId?: string;
//     lastSyncTime?: string;
//     parentJobId?: string; // Track parent job
//   };
// }

// // Queue configuration
// const queueConfig = {
//   connection: getRedisConnection(),
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: {
//       type: "exponential",
//       delay: 1000,
//     },
//     removeOnComplete: true,
//     removeOnFail: false,
//   },
// };

// // Create queues
// export const queues = {
//   [QUEUE_NAMES.SYNC_PIPELINE]: new Queue(
//     QUEUE_NAMES.SYNC_PIPELINE,
//     queueConfig
//   ),
// };

// // Create queue events
// export const queueEvents = {
//   [QUEUE_NAMES.SYNC_PIPELINE]: new QueueEvents(QUEUE_NAMES.SYNC_PIPELINE, {
//     connection: getRedisConnection(),
//   }),
// };

// // Create workers with enhanced error handling and logging
// export const workers = {
//   [QUEUE_NAMES.SYNC_PIPELINE]: new Worker(
//     QUEUE_NAMES.SYNC_PIPELINE,
//     async job => {
//       const data = job.data as SyncJobData;
//       const jobId = job.id as string;

//       // Add concurrency control for user-specific jobs
//       const userLockKey = `user-lock:${data.userId}`;
//       const lock = await getRedisConnection().set(
//         userLockKey,
//         jobId as string,
//         "KEEPTTL"
//       );

//       if (!lock) {
//         console.warn(`[Job] User ${data.userId} sync already in progress`);
//         throw new Error("User sync in progress");
//       }

//       try {
//         switch (data.type) {
//           case "sync-notion":
//             try {
//               await runNotionSync(data.accountId, data.userId);
//             } catch (error) {
//               console.error(`[Job] Notion sync failed:`, {
//                 error: error instanceof Error ? error.message : error,
//                 stack: error instanceof Error ? error.stack : undefined,
//               });
//               throw error;
//             }
//             await addJob(
//               QUEUE_NAMES.SYNC_PIPELINE,
//               {
//                 userId: data.userId,
//                 accountId: data.accountId,
//                 type: "process-content",
//                 metadata: {
//                   parentJobId: jobId,
//                   lastSyncTime: data.metadata?.lastSyncTime,
//                 },
//               },
//               {
//                 dependencies: [jobId],
//               }
//             );
//             break;

//           case "process-content":
//             try {
//               // TODO: Implement content processing
//               console.log(`[Job] Mock content processing completed`);
//             } catch (error) {
//               console.error(`[Job] Content processing failed:`, {
//                 error: error instanceof Error ? error.message : error,
//                 stack: error instanceof Error ? error.stack : undefined,
//               });
//               throw error;
//             }

//             await addJob(
//               QUEUE_NAMES.SYNC_PIPELINE,
//               {
//                 userId: data.userId,
//                 accountId: data.accountId,
//                 type: "generate-questions",
//                 metadata: {
//                   parentJobId: jobId,
//                   lastSyncTime: data.metadata?.lastSyncTime,
//                 },
//               },
//               {
//                 dependencies: [jobId],
//               }
//             );
//             break;

//           case "generate-questions":
//             console.log(
//               `[Job ${jobId}] Starting question generation for user ${data.userId}`
//             );
//             try {
//               // TODO: Implement question generation
//               console.log(`[Job] Mock question generation completed`);
//             } catch (error) {
//               console.error(`[Job] Question generation failed:`, {
//                 error: error instanceof Error ? error.message : error,
//                 stack: error instanceof Error ? error.stack : undefined,
//               });
//               throw error;
//             }
//             break;
//         }

//         console.log(
//           `[Job] Successfully completed ${data.type} for user ${data.userId}`
//         );
//         return { processed: true, jobId };
//       } catch (error) {
//         console.error(
//           `[Job] Failed to process ${data.type} for user ${data.userId}:`,
//           {
//             error: error instanceof Error ? error.message : error,
//             stack: error instanceof Error ? error.stack : undefined,
//           }
//         );
//         throw error;
//       } finally {
//         // Release the user lock
//         try {
//           await getRedisConnection().del(userLockKey);
//           console.log(`[Job] Released lock for user ${data.userId}`);
//         } catch (error) {
//           console.error(
//             `[Job] Failed to release lock for user ${data.userId}:`,
//             error
//           );
//         }
//       }
//     },
//     {
//       connection: getRedisConnection(),
//       concurrency: 5,
//       limiter: {
//         max: 100,
//         duration: 1000,
//       },
//     }
//   ),
// };

// // Helper function to add a job to a queue
// export async function addJob<T extends SyncJobData>(
//   queueName: QueueName,
//   data: T,
//   options?: {
//     priority?: number;
//     delay?: number;
//     dependencies?: string[];
//     jobId?: string;
//   }
// ) {
//   const queue = queues[queueName];
//   const jobId = options?.jobId || `${data.userId}-${data.type}-${Date.now()}`;

//   console.log(`[Queue] Adding job ${jobId} of type ${data.type}`, {
//     dependencies: options?.dependencies,
//     metadata: data.metadata,
//   });

//   return queue.add(data.type, data, {
//     ...options,
//     jobId,
//   });
// }

// // Graceful shutdown
// export async function closeQueues() {
//   await Promise.all([
//     ...Object.values(queues).map(queue => queue.close()),
//     ...Object.values(workers).map(worker => worker.close()),
//     ...Object.values(queueEvents).map(events => events.close()),
//     getRedisConnection().quit(),
//   ]);
// }
