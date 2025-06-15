// Notion API Types
// Based on https://developers.notion.com/reference/

// Common types
export type NotionObjectType =
  | "page"
  | "database"
  | "block"
  | "user"
  | "comment"
  | "file";

export interface NotionParent {
  type: "database_id" | "page_id" | "workspace" | "block_id";
  database_id?: string;
  page_id?: string;
  workspace?: boolean;
  block_id?: string;
}

export interface NotionRichText {
  type: "text" | "mention" | "equation";
  text?: {
    content: string;
    link?: {
      url: string;
    } | null;
  };
  mention?: {
    type: "user" | "page" | "database" | "date";
    user?: NotionUser;
    page?: { id: string };
    database?: { id: string };
    date?: {
      start: string;
      end?: string;
    };
  };
  equation?: {
    expression: string;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href: string | null;
}

export interface NotionIcon {
  type: "emoji" | "external" | "file";
  emoji?: string;
  external?: {
    url: string;
  };
  file?: {
    url: string;
    expiry_time: string;
  };
}

export interface NotionCover {
  type: "external" | "file";
  external?: {
    url: string;
  };
  file?: {
    url: string;
    expiry_time: string;
  };
}

// Database types
export interface NotionDatabase {
  id: string;
  notionId: string;
  object: "database";
  created_time: string;
  last_edited_time: string;
  title: NotionRichText[];
  description: NotionRichText[];
  icon: NotionIcon | null;
  cover: NotionCover | null;
  properties: Record<string, NotionProperty>;
  parent: NotionParent;
  url: string;
  public_url: string | null;
  archived: boolean;
  is_inline: boolean;
}

export type NotionPropertyType =
  | "title"
  | "rich_text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "people"
  | "files"
  | "checkbox"
  | "url"
  | "email"
  | "phone_number"
  | "formula"
  | "relation"
  | "rollup"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by";

export interface NotionProperty {
  id: string;
  type: NotionPropertyType;
  name: string;
  // Additional properties based on type
  [key: string]: any;
}

// Page types
export interface NotionPage {
  id: string;
  notionId: string;
  object: "page";
  created_time: string;
  last_edited_time: string;
  icon: NotionIcon | null;
  cover: NotionCover | null;
  properties: Record<string, NotionProperty>;
  parent: NotionParent;
  url: string;
  public_url: string | null;
  archived: boolean;
}

// Block types
export interface NotionBlock {
  id: string;
  object: "block";
  type: NotionBlockType;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  archived: boolean;
  // Additional properties based on type
  [key: string]: any;
}

export type NotionBlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "toggle"
  | "child_database"
  | "child_page"
  | "embed"
  | "image"
  | "video"
  | "file"
  | "pdf"
  | "bookmark"
  | "callout"
  | "quote"
  | "equation"
  | "divider"
  | "table_of_contents"
  | "column_list"
  | "column"
  | "link_to_page"
  | "synced_block"
  | "template"
  | "link_preview"
  | "table"
  | "table_row";

// User types
export interface NotionUser {
  id: string;
  object: "user";
  type: "person" | "bot";
  name: string | null;
  avatar_url: string | null;
  person?: {
    email: string;
  };
  bot?: {
    owner: {
      type: "user" | "workspace";
      user?: {
        id: string;
        object: "user";
        name: string | null;
        avatar_url: string | null;
        type: "person" | "bot";
        person?: {
          email: string;
        };
      };
      workspace?: boolean;
    };
  };
}

// API Response types
export interface NotionListResponse<T> {
  object: "list";
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionError {
  object: "error";
  status: number;
  code: string;
  message: string;
}

// OAuth types
export interface NotionOAuthResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: "user" | "workspace";
    user?: {
      id: string;
      object: "user";
      name: string | null;
      avatar_url: string | null;
      type: "person" | "bot";
      person?: {
        email: string;
      };
    };
    workspace?: boolean;
  };
  duplicated_template_id: string | null;
  request_id: string;
}

// Integration types
export interface NotionIntegrationStats {
  totalPages: number;
  totalDatabases: number;
}

// Account types
export interface NotionAccount {
  id: string;
  userId: string;
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string | null;
  botId: string;
  status: "active" | "inactive";
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
