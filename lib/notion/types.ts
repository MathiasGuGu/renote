// Database types (Drizzle inferred)
export type User = {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  preferences?: {
    theme?: "light" | "dark";
    notifications?: boolean;
    language?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type NotionAccount = {
  id: string;
  userId: string;
  workspaceName: string;
  workspaceId: string;
  workspaceIcon?: string | null;
  accessToken: string;
  botId: string;
  owner?: {
    type: "user" | "workspace";
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
      type: string;
      person?: {
        email: string;
      };
    };
  } | null;
  duplicatedTemplateId?: string | null;
  requestId?: string | null;
  status: "connected" | "disconnected" | "error";
  lastSync?: Date | null;
  syncError?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotionDatabase = {
  id: string;
  accountId: string;
  notionId: string;
  title: string;
  description?: string | null;
  url: string;
  cover?: {
    type: "external" | "file";
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  icon?: {
    type: "emoji" | "external" | "file";
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  properties: any; // JSON object
  parent?: {
    type: "workspace" | "page_id" | "database_id" | "block_id";
    workspace?: boolean;
    page_id?: string;
    database_id?: string;
    block_id?: string;
  } | null;
  archived?: string | null;
  inTrash?: string | null;
  isInline?: string | null;
  publicUrl?: string | null;
  pageCount?: number | null;
  lastEditedTime: Date;
  createdTime: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NotionPage = {
  id: string;
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: {
    type: "external" | "file";
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  icon?: {
    type: "emoji" | "external" | "file";
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  parent?: {
    type: "workspace" | "page_id" | "database_id" | "block_id";
    workspace?: boolean;
    page_id?: string;
    database_id?: string;
    block_id?: string;
  } | null;
  properties?: any | null; // JSON object
  content?: any | null; // JSON object
  archived?: string | null;
  inTrash?: string | null;
  publicUrl?: string | null;
  lastEditedTime: Date;
  createdTime: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export interface NotionIntegrationStats {
  totalDatabases: number;
  totalPages: number;
  lastSync: Date | null;
  syncErrors: number;
}

// Notion API response types
export interface NotionOAuthResponse {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: "user" | "workspace";
    user?: {
      object: "user";
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person?: {
        email: string;
      };
    };
  };
  duplicated_template_id?: string;
  request_id: string;
}
