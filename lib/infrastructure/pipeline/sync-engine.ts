/*
=========================================================
Sync Engine for syncing data from Notion to the database.
=========================================================
*/

import { NotionClient, NotionDatabaseQueryResponse, NotionPageResponse } from "@/lib/integrations/notion";

export class SyncEngine {
  constructor(private readonly notionClient: NotionClient) {
    this.notionClient = notionClient;
  }

  async syncPages() {
    const pages: NotionPageResponse[] = await this.notionClient.getPages();
    for (const page of pages) {
      console.log
    }
  }

  async syncDatabases() {
    const databases: NotionDatabaseQueryResponse[] = await this.notionClient.getDatabases();
    for (const database of databases) {
      console.log(database);
    }
  }

  async sync() {
    await this.syncPages();
    await this.syncDatabases();
  }
}
