// import { WorkerManager } from "./workers-example";
// import { SyncLogger } from "../pipeline/sync-utilities";

// const logger = new SyncLogger('QueueInit', 'system');

// /**
//  * Initialize the queue system and start all workers
//  * This should be called when the application starts
//  */
// export async function initializeQueue(): Promise<void> {
//   try {
//     logger.info('Initializing queue system...');

//     // Start all workers
//     await WorkerManager.startAllWorkers();

//     logger.info('Queue system initialized successfully');

//     // Set up graceful shutdown handlers
//     setupShutdownHandlers();

//   } catch (error) {
//     logger.error('Failed to initialize queue system', error as Error);
//     throw error;
//   }
// }

// /**
//  * Shutdown the queue system gracefully
//  */
// export async function shutdownQueue(): Promise<void> {
//   try {
//     logger.info('Shutting down queue system...');

//     await WorkerManager.stopAllWorkers();

//     logger.info('Queue system shut down successfully');
//   } catch (error) {
//     logger.error('Error during queue shutdown', error as Error);
//     throw error;
//   }
// }

// /**
//  * Set up process handlers for graceful shutdown
//  */
// function setupShutdownHandlers(): void {
//   const shutdown = async (signal: string) => {
//     logger.info(`Received ${signal}, initiating graceful shutdown...`);

//     try {
//       await shutdownQueue();
//       process.exit(0);
//     } catch (error) {
//       logger.error('Error during shutdown', error as Error);
//       process.exit(1);
//     }
//   };

//   // Handle different shutdown signals
//   process.on('SIGTERM', () => shutdown('SIGTERM'));
//   process.on('SIGINT', () => shutdown('SIGINT'));

//   // Handle uncaught exceptions
//   process.on('uncaughtException', (error) => {
//     logger.error('Uncaught exception', error);
//     shutdown('uncaughtException');
//   });

//   process.on('unhandledRejection', (reason, promise) => {
//     logger.error('Unhandled promise rejection', new Error(String(reason)), {
//       promise: String(promise)
//     });
//     shutdown('unhandledRejection');
//   });
// }

// /**
//  * Health check for the queue system
//  */
// export async function checkQueueHealth(): Promise<{
//   healthy: boolean;
//   workers: number;
//   issues: string[];
// }> {
//   const issues: string[] = [];

//   try {
//     const workerCount = WorkerManager.getWorkerCount();

//     if (workerCount === 0) {
//       issues.push('No workers are running');
//     }

//     // TODO: Add more health checks
//     // - Redis connection status
//     // - Queue backlog size
//     // - Failed job count
//     // - Memory usage

//     return {
//       healthy: issues.length === 0,
//       workers: workerCount,
//       issues
//     };

//   } catch (error) {
//     logger.error('Health check failed', error as Error);

//     return {
//       healthy: false,
//       workers: 0,
//       issues: ['Health check failed: ' + (error as Error).message]
//     };
//   }
// }
