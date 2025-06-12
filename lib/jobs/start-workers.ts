import dotenv from "dotenv";
import { simpleJobWorkers } from "./simple-workers";

// Load environment variables from .env file
dotenv.config();

async function startWorkers() {
  try {
    console.log("Starting background job workers...");

    // Verify DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Please check your .env file."
      );
    }

    console.log("Database URL found, initializing workers...");
    await simpleJobWorkers.start();
    console.log("Background job workers started successfully");

    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("Shutting down job workers...");
      await simpleJobWorkers.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down job workers...");
      await simpleJobWorkers.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start job workers:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startWorkers();
}

export { startWorkers };
