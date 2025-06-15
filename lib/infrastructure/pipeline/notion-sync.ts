// This is the acutal syncing of notion pages, database, etc.
// It should be called with the queue worker and should get data from the Notion API
// It should then save the data to the database
// It should then queue the next job in the pipeline

import { NotionClient } from "../../integrations/notion/client";
import {
  getNotionAccountByAccountId,
  getNotionAccountsByUserId,
  createNotionAccount,
  updateNotionAccount,
} from "../../data/queries/notion-accounts";
import {
  updateNotionPage,
  createNotionPage,
  getNotionPagesByAccountId,
  upsertNotionPage,
} from "../../data/queries/notion-pages";
import {
  getNotionDatabasesByAccountId,
  upsertNotionDatabase,
} from "../../data/queries/notion-databases";
import type {
  NotionDatabase,
  NotionPage,
  NotionRichText,
  NotionIcon,
  NotionCover,
  NotionParent,
} from "../../integrations/notion/types";
import { addJob, QUEUE_NAMES, SyncJobData } from "../queue/queue";

interface SyncResult {
  success: boolean;
  error?: string;
  stats: {
    pagesSynced: number;
    databasesSynced: number;
    errors: number;
  };
}

// Define record types for database operations
type NotionDatabaseRecord = NotionDatabase & {
  accountId: string;
  pageCount: number;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type NotionPageRecord = NotionPage & {
  accountId: string;
  title: string;
  content: any;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class NotionSyncEngine {
  private client: NotionClient;
  private accountId: string;
  private syncStats: {
    pagesSynced: number;
    databasesSynced: number;
    errors: number;
  };

  constructor(accessToken: string, accountId: string) {
    this.client = new NotionClient(accessToken);
    this.accountId = accountId;
    this.syncStats = {
      pagesSynced: 0,
      databasesSynced: 0,
      errors: 0,
    };
  }

  private extractTitle(title: NotionRichText[]): string {
    return title.map(t => t.plain_text).join("");
  }

  private async syncDatabases(): Promise<void> {
    const databases = await this.client.getDatabases();
    const existingDatabases = await getNotionDatabasesByAccountId(
      this.accountId
    );
    const existingMap = new Map(existingDatabases.map(db => [db.notionId, db]));

    for (const database of databases) {
      const record: NotionDatabaseRecord = {
        ...database,
        accountId: this.accountId,
        pageCount: 0, // Will be updated after syncing pages
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await upsertNotionDatabase(record);
    }
  }

  private async syncPages(): Promise<void> {
    const pages = await this.client.getPages();
    const existingPages = await getNotionPagesByAccountId(this.accountId);
    const existingMap = new Map(
      existingPages.map(page => [page.notionId, page])
    );

    for (const page of pages) {
      const pageContent = await this.client.getPageContent(page.id);
      const record = {
        accountId: this.accountId,
        notionId: page.id,
        title: this.extractTitle(page.properties?.title?.title || []),
        url: page.url,
        cover: page.cover,
        icon: page.icon,
        parent: page.parent,
        properties: page.properties,
        content: pageContent || null,
        archived: page.archived,
        public_url: page.public_url || "",
        last_edited_time: new Date(page.last_edited_time),
        created_time: new Date(page.created_time),
        lastSyncedAt: new Date(),
      };

      await upsertNotionPage(record);
    }
  }

  private async updatePageContent(page: NotionPageRecord): Promise<void> {
    const pageContent = await this.client.getPageContent(page.notionId);
    const updatedRecord = {
      title: page.title,
      url: page.url,
      cover: page.cover,
      icon: page.icon,
      parent: page.parent,
      properties: page.properties,
      content: pageContent || null,
      archived: page.archived,
      public_url: page.public_url || "",
      last_edited_time: new Date(page.last_edited_time),
      lastSyncedAt: new Date(),
    };

    await updateNotionPage(page.id, updatedRecord);
  }

  public async sync(): Promise<SyncResult> {
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
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        stats: this.syncStats,
      };
    }
  }
}

// Export a function to run the sync
export async function runNotionSync(
  accountId: string,
  userId: string
): Promise<SyncResult> {
  console.log(`[NotionSyncEngine] Running sync for account ${accountId}`);

  // Fetch the Notion account to get the access token
  const notionAccount = await getNotionAccountByAccountId(accountId);
  if (!notionAccount) {
    console.error(
      `[NotionSyncEngine] No Notion account found for account ID ${accountId}`
    );
    return {
      success: false,
      error: "No Notion account found",
      stats: {
        pagesSynced: 0,
        databasesSynced: 0,
        errors: 1,
      },
    };
  }

  // Log account details (excluding sensitive data)
  console.log(`[NotionSyncEngine] Found Notion account:
    - Workspace: ${notionAccount.workspaceName}
    - Status: ${notionAccount.status}
    - Last synced: ${notionAccount.lastSyncedAt}
    - Access token length: ${notionAccount.accessToken.length}
  `);

  if (!notionAccount.accessToken) {
    console.error(
      `[NotionSyncEngine] No access token found for account ID ${accountId}`
    );
    return {
      success: false,
      error: "No access token found",
      stats: {
        pagesSynced: 0,
        databasesSynced: 0,
        errors: 1,
      },
    };
  }

  const syncEngine = new NotionSyncEngine(notionAccount.accessToken, accountId);
  return syncEngine.sync();
}
