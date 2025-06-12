import dotenv from "dotenv";
import PgBoss from "pg-boss";

// Load environment variables
dotenv.config();

async function setupPgBoss() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set in environment variables");
    process.exit(1);
  }

  console.log("Setting up pg-boss tables...");
  console.log(
    "Database URL:",
    connectionString.replace(/\/\/.*@/, "//***:***@")
  ); // Hide credentials

  try {
    const boss = new PgBoss({
      connectionString,
      retryBackoff: true,
      retryLimit: 3,
    });

    console.log("Starting pg-boss to create tables...");
    await boss.start();
    console.log("✅ pg-boss started successfully and tables created");

    // Test sending multiple different jobs to understand the issue
    console.log("\n--- Testing job creation ---");

    // Test 1: Simple job with minimal data
    console.log("Test 1: Simple job");
    try {
      const testJobId1 = await boss.send("test-simple", { message: "hello" });
      console.log("Simple job result:", testJobId1);
    } catch (error) {
      console.error("Simple job error:", error);
    }

    // Test 2: Job with no data
    console.log("Test 2: Job with empty data");
    try {
      const testJobId2 = await boss.send("test-empty", {});
      console.log("Empty job result:", testJobId2);
    } catch (error) {
      console.error("Empty job error:", error);
    }

    // Test 3: Job with options
    console.log("Test 3: Job with options");
    try {
      const testJobId3 = await boss.send(
        "test-options",
        { data: "test" },
        {
          priority: 0,
          retryLimit: 3,
          expireInSeconds: 3600,
        }
      );
      console.log("Options job result:", testJobId3);
    } catch (error) {
      console.error("Options job error:", error);
    }

    // Test 4: Check if we can query existing jobs
    console.log("Test 4: Checking job status");
    try {
      // Try to get job state (this might give us more info)
      console.log("Boss instance state:", {
        isStarted: boss && typeof boss.send === "function",
        hasDb: !!boss,
      });
    } catch (error) {
      console.error("State check error:", error);
    }

    await boss.stop();
    console.log("\n✅ pg-boss setup completed");
  } catch (error) {
    console.error("❌ Failed to set up pg-boss:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    process.exit(1);
  }
}

if (require.main === module) {
  setupPgBoss();
}

export { setupPgBoss };
