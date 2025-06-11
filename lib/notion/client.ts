import { NotionAccount, NotionDatabase, NotionPage, NotionIntegrationStats } from './types';

export class NotionClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // TODO: Implement actual Notion API integration
  async getUser(): Promise<any> {
    throw new Error('Not implemented');
  }

  async getDatabases(): Promise<NotionDatabase[]> {
    throw new Error('Not implemented');
  }

  async getPages(): Promise<NotionPage[]> {
    throw new Error('Not implemented');
  }

  async search(query: string): Promise<any> {
    throw new Error('Not implemented');
  }
}

export const notionConfig = {
  clientId: process.env.NOTION_CLIENT_ID,
  clientSecret: process.env.NOTION_CLIENT_SECRET,
  redirectUri: process.env.NOTION_REDIRECT_URI,
  authUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
};

// Mock functions for development
export async function getNotionAccounts(userId: string): Promise<NotionAccount[]> {
  // TODO: Implement database query to get user's Notion accounts
  return [];
}

export async function createNotionAccount(userId: string, authCode: string): Promise<NotionAccount> {
  // TODO: Implement OAuth flow and save account
  throw new Error('Not implemented');
}

export async function deleteNotionAccount(userId: string, accountId: string): Promise<void> {
  // TODO: Implement account deletion
  throw new Error('Not implemented');
}

export async function getNotionStats(accountId: string): Promise<NotionIntegrationStats> {
  // TODO: Implement stats calculation
  return {
    totalDatabases: 0,
    totalPages: 0,
    lastSync: null,
    syncErrors: 0,
  };
}