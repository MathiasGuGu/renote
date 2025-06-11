import {
  NotionAccount,
  NotionDatabase,
  NotionPage,
  NotionIntegrationStats,
} from "./types";
import { getUserNotionAccounts, getNotionIntegrationStats } from "@/app/server";

export class NotionClient {
  private accessToken: string;
  private baseUrl = "https://api.notion.com/v1";
  private version = "2022-06-28";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

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
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Notion API Error (${response.status}): ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  async getUser(): Promise<any> {
    return this.makeRequest("/users/me");
  }

  async getDatabases(): Promise<NotionDatabase[]> {
    try {
      const response = await this.makeRequest("/search", {
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

      return response.results.map((db: any) => ({
        id: db.id,
        title: this.extractTitle(db.title),
        url: db.url,
        lastEditedTime: db.last_edited_time,
        cover: db.cover,
        icon: db.icon,
        properties: db.properties,
        parent: db.parent,
        archived: db.archived,
        in_trash: db.in_trash,
        is_inline: db.is_inline,
        public_url: db.public_url,
        created_time: db.created_time,
      }));
    } catch (error) {
      console.error("Error fetching databases:", error);
      throw error;
    }
  }

  async getPages(): Promise<NotionPage[]> {
    try {
      const response = await this.makeRequest("/search", {
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
      });

      return response.results.map((page: any) => ({
        id: page.id,
        title: this.extractTitle(page.properties?.title?.title || []),
        url: page.url,
        lastEditedTime: page.last_edited_time,
        cover: page.cover,
        icon: page.icon,
        parent: page.parent,
        properties: page.properties,
        archived: page.archived,
        in_trash: page.in_trash,
        public_url: page.public_url,
        created_time: page.created_time,
      }));
    } catch (error) {
      console.error("Error fetching pages:", error);
      throw error;
    }
  }

  async search(query: string): Promise<any> {
    return this.makeRequest("/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      }),
    });
  }

  async getDatabase(databaseId: string) {
    return this.makeRequest(`/databases/${databaseId}`);
  }

  async getPage(pageId: string) {
    return this.makeRequest(`/pages/${pageId}`);
  }

  async getPageContent(pageId: string) {
    return this.makeRequest(`/blocks/${pageId}/children`);
  }

  async queryDatabase(databaseId: string, options: any = {}) {
    return this.makeRequest(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  private extractTitle(titleArray: any[]): string {
    if (!Array.isArray(titleArray) || titleArray.length === 0) {
      return "Untitled";
    }

    return (
      titleArray
        .map(
          (titleObj: any) => titleObj.plain_text || titleObj.text?.content || ""
        )
        .join("")
        .trim() || "Untitled"
    );
  }
}

export const notionConfig = {
  clientId: process.env.NOTION_CLIENT_ID,
  clientSecret: process.env.NOTION_CLIENT_SECRET,
  redirectUri: process.env.NOTION_REDIRECT_URI,
  authUrl: "https://api.notion.com/v1/oauth/authorize",
  tokenUrl: "https://api.notion.com/v1/oauth/token",
};

// Server-side functions that use the database
export async function getNotionAccounts(
  userId: string
): Promise<NotionAccount[]> {
  return await getUserNotionAccounts();
}

export async function createNotionAccount(
  userId: string,
  authCode: string
): Promise<NotionAccount> {
  // This is now handled in the OAuth callback using server functions
  throw new Error("Use OAuth callback endpoint to create accounts");
}

export async function deleteNotionAccount(
  userId: string,
  accountId: string
): Promise<void> {
  // This is now handled by server functions
  throw new Error("Use server action to delete accounts");
}

export async function getNotionStats(
  accountId: string
): Promise<NotionIntegrationStats> {
  return await getNotionIntegrationStats(accountId);
}

// Utility functions for working with Notion data
export function formatNotionDate(dateString: string): Date {
  return new Date(dateString);
}

export function extractNotionIcon(icon: any): string {
  if (!icon) return "";

  if (icon.type === "emoji") {
    return icon.emoji;
  } else if (icon.type === "external") {
    return icon.external.url;
  } else if (icon.type === "file") {
    return icon.file.url;
  }

  return "";
}

export function extractNotionCover(cover: any): string {
  if (!cover) return "";

  if (cover.type === "external") {
    return cover.external.url;
  } else if (cover.type === "file") {
    return cover.file.url;
  }

  return "";
}

// Rate limiting helper
export class NotionRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 3; // Notion allows 3 requests per second
  private readonly timeWindow = 1000; // 1 second

  async throttle(): Promise<void> {
    const now = Date.now();

    // Remove requests older than the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    // If we've made too many requests, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requests.push(Date.now());
  }
}
