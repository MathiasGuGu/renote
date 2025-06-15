// This is the syncing of notion pages, database, etc.
// It should be called with the queue worker and should get data from the Notion API
// It should then save the data to the database

import { NotionClient } from "../../integrations/notion/client";

interface SyncResult {
  success: boolean;
  error?: string;   
  stats: {
    pagesSynced: number;
    databasesSynced: number;
    errors: number;
  };
}


export class NotionSyncEngine {
  private client: NotionClient;
  private clerkId: string;
  private syncStats: {
    pagesSynced: number;
    databasesSynced: number;
    errors: number;
  };

  constructor(accessToken: string, clerkId: string) {
    this.client = new NotionClient(accessToken);
    this.clerkId = clerkId;
    this.syncStats = {
      pagesSynced: 0,
      databasesSynced: 0,
      errors: 0,
    };
  }

  private async syncDatabases(): Promise<void | string> {
    // Get all databases from the database
    // Get databases from the Notion API
    // Compare the databases from the database with the databases from the Notion API
    // If the database is not in the database, create it
    // If the database is in the database, update it
    // For each database, get the pages from the Notion API
    // Save the new database to the database
    return "Not implemented";   
  }

  private async syncPages(): Promise<void | string> {
    // Get all pages from the database
    // Get pages from the Notion API
    // Compare the pages from the database with the pages from the Notion API
    // If the page is not in the database, create it
    // If the page is in the database, update it
    // For each page, get the content from the Notion API
    // Save the new page content to the database
    return "Not implemented";
  }

  public async sync(): Promise<SyncResult | string> {
    try {
      await this.syncDatabases();
      await this.syncPages();
      return {
        success: true,
        stats: this.syncStats,
      };
    } catch (error) {
      console.error("[NotionSyncEngine] Sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        stats: this.syncStats,
      };
    }
  }
}

// Export a function to run the sync
export async function runNotionSync(
  clerkId: string,
  userId: string
): Promise<SyncResult | string> {
  const syncEngine = new NotionSyncEngine(clerkId, userId);
  return syncEngine.sync();
}
