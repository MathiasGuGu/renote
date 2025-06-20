import type {
  User,
  RichText,
  Icon,
  Cover,
  Parent,
  AnyPropertyValue,
  NotionBlock,
} from "@/lib/integrations/notion/types";

// Type for the users table
export interface UsersDatabaseReturn {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  preferences: {
    theme?: "light" | "dark";
    notifications?: boolean;
    language?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Type for the notion_accounts table
export interface NotionAccountsDatabaseReturn {
  id: string;
  userId: string;
  workspaceName: string;
  workspaceId: string;
  workspaceIcon: string | null;
  accessToken: string;
  botId: string;
  owner: User | null;
  duplicatedTemplateId: string | null;
  requestId: string | null;
  status: "connected" | "disconnected" | "error";
  lastSync: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Type for the notion_databases table
export interface NotionDatabasesDatabaseReturn {
  id: string;
  accountId: string;
  notionId: string;
  title: RichText[];
  description: RichText[] | null;
  url: string;
  cover: Cover | null;
  icon: Icon | null;
  properties: Record<string, AnyPropertyValue>;
  parent: Parent;
  archived: boolean | null;
  is_inline: boolean | null;
  public_url: string | null;
  pageCount: number | null;
  created_time: Date;
  last_edited_time: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  in_trash: boolean | null;
}

// Type for the notion_pages table
export interface NotionPagesDatabaseReturn {
  id: string;
  accountId: string;
  notionId: string;
  title: RichText[];
  url: string;
  cover: Cover | null;
  icon: Icon | null;
  parent: Parent;
  properties: Record<string, AnyPropertyValue>;
  content: NotionBlock[] | null;
  archived: boolean | null;
  public_url: string | null;
  created_time: Date;
  last_edited_time: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  in_trash: boolean | null;
}
