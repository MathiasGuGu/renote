// This is the syncing of notion pages, database, etc.
// It should be called with the queue worker and should get data from the Notion API
// It should then save the data to the database

import { exchangeNotionCode } from "@/lib/actions/notion-actions";
import { NotionClient } from "../../integrations/notion/client";
import {
  NotionDatabase,
  NotionDatabaseQueryResponse,
  NotionPage,
} from "@/lib/integrations/notion";
import { getNotionDatabasesWithClerkId } from "@/lib/data/queries";
import { NotionDatabasesDatabaseReturn } from "@/lib/db/types";

interface SyncResult {
  success: boolean;
  error?: string;
  stats: {
    pagesSynced: number;
    databasesSynced: number;
    errors: number;
  };
}

type DatabaseFieldExtractor<T> = {
  [K in keyof T]?: (db: T) => any;
};

export class NotionSyncEngine {
  private client: NotionClient;
  private clerkId: string;
  private accessToken: string;
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

  private async init(): Promise<void> {
    this.accessToken = await exchangeNotionCode(this.clerkId);
  }

  private readonly PAGE_FIELD_MAP: DatabaseFieldExtractor<NotionPage> = {
    icon: (db: NotionPage) => db.icon,
    cover: (db: NotionPage) => db.cover,
    url: (db: NotionPage) => db.url,
    parent: (db: NotionPage) => db.parent,
    properties: (db: NotionPage) => db.properties,
    archived: (db: NotionPage) => db.archived,
    created_time: (db: NotionPage) => db.created_time,
    last_edited_time: (db: NotionPage) => db.last_edited_time,
    created_by: (db: NotionPage) => db.created_by,
    last_edited_by: (db: NotionPage) => db.last_edited_by,
  };

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

  private readonly DATABASE_FIELD_MAP: DatabaseFieldExtractor<NotionDatabase> =
    {
      title: (db: NotionDatabase) => this.extractPlainText(db.title),
      description: (db: NotionDatabase) =>
        this.extractPlainText(db.description),
      icon: (db: NotionDatabase) => db.icon,
      cover: (db: NotionDatabase) => db.cover,
      url: (db: NotionDatabase) => db.url,
      parent: (db: NotionDatabase) => db.parent,
      created_time: (db: NotionDatabase) => db.created_time,
      last_edited_time: (db: NotionDatabase) => db.last_edited_time,
      archived: (db: NotionDatabase) => db.archived,
      created_by: (db: NotionDatabase) => db.created_by,
      last_edited_by: (db: NotionDatabase) => db.last_edited_by,
      properties: (db: NotionDatabase) => db.properties,
    };

  private async syncDatabases(): Promise<void | string> {
    const databasesToCreate: NotionDatabase[] = [];
    const databasesToUpdate: Array<{
      id: string;
      notionDb: NotionDatabase;
      changes: Record<string, any>;
    }> = [];
    const propertiesToCreate: Array<{
      databaseId: string;
      property: any;
    }> = [];
    const propertiesToUpdate: Array<{
      id: any;
      changes: Record<string, any>;
    }> = [];

    // Get all databases from the database
    const userDbs: NotionDatabasesDatabaseReturn[] =
      await getNotionDatabasesWithClerkId();
    // Get databases from the Notion API
    const notionDbsResponse: NotionDatabaseQueryResponse =
      await this.client.getDatabases();
    const notionDbs: NotionDatabase[] = notionDbsResponse.results;

    // Compare the notionDbs from the database with the databases from the Notion API
    for (const notionDb of notionDbs) {
      const existingDb: NotionDatabasesDatabaseReturn | undefined =
        userDbs.find(userDb => userDb.notionId === notionDb.id);
      if (!existingDb) {
        databasesToCreate.push(notionDb);
      } else {
        const changes: Record<string, any> = {};
        for (const [fieldName, extractor] of Object.entries(
          this.DATABASE_FIELD_MAP
        )) {
          const existingValue = (existingDb as any)[fieldName];
          const notionValue = extractor(notionDb);

          if (this.hasChanged(existingValue, notionValue)) {
            changes[fieldName] = notionValue;
          }
        }

        if (Object.keys(changes).length > 0) {
          databasesToUpdate.push({
            id: existingDb.id,
            notionDb,
            changes,
          });
        }
      }
    }

    // BATCH EXECUTION PHASE
    if (databasesToCreate.length > 0) {
      await this.batchCreateDatabases(databasesToCreate);
      this.syncStats.databasesSynced += databasesToCreate.length;
    }

    if (databasesToUpdate.length > 0) {
      await this.batchUpdateDatabases(databasesToUpdate);
      this.syncStats.databasesSynced += databasesToUpdate.length;
    }

    return "Databases synced successfully";
  }

  // Helper methods for comparison
  private extractPlainText(richText: any): string | null {
    if (!richText) return null;
    if (typeof richText === "string") return richText;
    if (Array.isArray(richText) && richText.length > 0) {
      return richText.map(item => item.plain_text || "").join("");
    }
    return richText.plain_text || null;
  }

  private hasChanged(existingValue: any, newValue: any): boolean {
    // Handle null/undefined cases
    if (existingValue === null && newValue === null) return false;
    if (existingValue === undefined && newValue === undefined) return false;
    if (existingValue === null || existingValue === undefined)
      return newValue !== null && newValue !== undefined;
    if (newValue === null || newValue === undefined)
      return existingValue !== null && existingValue !== undefined;

    // Handle date strings
    if (typeof existingValue === "string" && typeof newValue === "string") {
      // For ISO date strings, compare as dates
      if (existingValue.includes("T") && newValue.includes("T")) {
        return (
          new Date(existingValue).getTime() !== new Date(newValue).getTime()
        );
      }
    }

    return existingValue !== newValue;
  }

  // Placeholder batch methods - implement these based on your database layer
  private async batchCreateDatabases(
    databases: NotionDatabase[]
  ): Promise<void> {
    // TODO: Implement batch database creation
    console.log(`Creating ${databases.length} databases`);
  }

  private async batchUpdateDatabases(
    updates: Array<{
      id: string;
      notionDb: NotionDatabase;
      changes: Record<string, any>;
    }>
  ): Promise<void> {
    // TODO: Implement batch database updates
    console.log(`Updating ${updates.length} databases`);
  }

  public async sync(): Promise<SyncResult> {
    try {
      console.log("[NotionSyncEngine] Sync started");
      const start = Date.now();
      await this.syncDatabases();
      await this.syncPages();
      const end = Date.now();
      console.log(`[NotionSyncEngine] Sync completed in ${end - start}ms`);
      return {
        success: true,
        stats: this.syncStats,
      };
    } catch (error) {
      console.error("[NotionSyncEngine] Sync failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
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
