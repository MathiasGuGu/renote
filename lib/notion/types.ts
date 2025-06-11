export interface NotionAccount {
  id: string;
  workspaceName: string;
  workspaceIcon?: string;
  accessToken: string;
  botId: string;
  userId: string;
  connectedAt: Date;
  lastSync?: Date;
  status: "connected" | "disconnected" | "error";
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  cover?: {
    type: string;
    url?: string;
  };
  icon?: {
    type: string;
    emoji?: string;
    url?: string;
  };
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  cover?: {
    type: string;
    url?: string;
  };
  icon?: {
    type: string;
    emoji?: string;
    url?: string;
  };
}

export interface NotionIntegrationStats {
  totalDatabases: number;
  totalPages: number;
  lastSync: Date | null;
  syncErrors: number;
}
