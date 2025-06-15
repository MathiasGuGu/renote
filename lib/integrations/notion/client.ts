/*
===============================================
This is a client for the Notion API.
===============================================
The main function is to fetch data from the Notion API.
 - getUser: Get the current user
 - getDatabases: Get all databases
 - getPages: Get all pages
 - search: Search for pages
 - getDatabase: Get a database
 - getPage: Get a page
 - getPageContent: Get the content of a page
 - queryDatabase: Query a database
===============================================
*/

import {
  NotionAccount,
  NotionDatabase,
  NotionPage,
  NotionIntegrationStats,
  NotionBlock,
  NotionUser,
  NotionListResponse,
  NotionError,
  NotionRichText,
} from "./types";

export const notionConfig = {
  clientId: process.env.NOTION_CLIENT_ID,
  clientSecret: process.env.NOTION_CLIENT_SECRET,
  redirectUri: process.env.NOTION_REDIRECT_URI,
  authUrl: "https://api.notion.com/v1/oauth/authorize",
  tokenUrl: "https://api.notion.com/v1/oauth/token",
};

export class NotionClient {
  private accessToken: string;
  private baseUrl = "https://api.notion.com/v1";
  private version = "2022-06-28";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Notion-Version": this.version,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as NotionError;
        throw new Error(`Notion API Error (${error.status}): ${error.message}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Notion API request failed: ${error.message}`);
      }
      throw new Error("Unknown error occurred while making Notion API request");
    }
  }

  async getUser(): Promise<NotionUser> {
    return this.makeRequest<NotionUser>("/users/me");
  }

  async getDatabases(): Promise<NotionDatabase[]> {
    try {
      const response = await this.makeRequest<
        NotionListResponse<NotionDatabase>
      >("/search", {
        method: "POST",
        body: JSON.stringify({
          filter: {
            value: "database",
            property: "object",
          },
          sort: {
            direction: "descending",
            timestamp: "last_edited_time",
          },
        }),
      });

      return response.results.map(db => ({
        ...db,
        notionId: db.id,
      }));
    } catch (error) {
      console.error("Error fetching databases:", error);
      throw error;
    }
  }

  async getPages(): Promise<NotionPage[]> {
    try {
      const response = await this.makeRequest<NotionListResponse<NotionPage>>(
        "/search",
        {
          method: "POST",
          body: JSON.stringify({
            filter: {
              value: "page",
              property: "object",
            },
            sort: {
              direction: "descending",
              timestamp: "last_edited_time",
            },
          }),
        }
      );

      return response.results.map(page => ({
        ...page,
        notionId: page.id,
      }));
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw error;
    }
  }

  async search(
    query: string
  ): Promise<NotionListResponse<NotionPage | NotionDatabase>> {
    return this.makeRequest<NotionListResponse<NotionPage | NotionDatabase>>(
      "/search",
      {
        method: "POST",
        body: JSON.stringify({
          query,
          sort: {
            direction: "descending",
            timestamp: "last_edited_time",
          },
        }),
      }
    );
  }

  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const db = await this.makeRequest<NotionDatabase>(
      `/databases/${databaseId}`
    );
    return {
      ...db,
      notionId: db.id,
    };
  }

  async getPage(pageId: string): Promise<NotionPage> {
    const page = await this.makeRequest<NotionPage>(`/pages/${pageId}`);
    return {
      ...page,
      notionId: page.id,
    };
  }

  async getPageContent(
    pageId: string
  ): Promise<NotionListResponse<NotionBlock>> {
    return this.makeRequest<NotionListResponse<NotionBlock>>(
      `/blocks/${pageId}/children`
    );
  }

  async queryDatabase(
    databaseId: string,
    options: {
      start_cursor?: string;
      page_size?: number;
      filter?: any;
      sorts?: any[];
    } = {}
  ): Promise<NotionListResponse<NotionPage>> {
    const response = await this.makeRequest<NotionListResponse<NotionPage>>(
      `/databases/${databaseId}/query`,
      {
        method: "POST",
        body: JSON.stringify(options),
      }
    );

    return {
      ...response,
      results: response.results.map(page => ({
        ...page,
        notionId: page.id,
      })),
    };
  }

  async getUserNotionAccounts(): Promise<NotionAccount[]> {
    return [];
  }

  async getNotionIntegrationStats(
    accountId: string
  ): Promise<NotionIntegrationStats> {
    return {
      totalPages: 0,
      totalDatabases: 0,
    };
  }

  private extractTitle(titleArray: NotionRichText[]): string {
    if (!Array.isArray(titleArray) || titleArray.length === 0) {
      return "Untitled";
    }

    return (
      titleArray
        .map(titleObj => titleObj.plain_text)
        .join("")
        .trim() || "Untitled"
    );
  }
}
