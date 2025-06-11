"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  createUser,
  getUserByClerkId,
  getUserOrCreate,
  updateUser,
} from "@/lib/db/queries/users";
import {
  createNotionAccount as createNotionAccountDB,
  getNotionAccountsByUserId,
  getNotionAccountById,
  updateNotionAccount,
  deleteNotionAccount,
  updateLastSync,
  updateSyncError,
} from "@/lib/db/queries/notion-accounts";
import {
  upsertNotionDatabase,
  getNotionDatabasesByAccountId,
  deleteNotionDatabasesByAccountId,
} from "@/lib/db/queries/notion-databases";
import {
  upsertNotionPage,
  getNotionPagesByAccountId,
  deleteNotionPagesByAccountId,
} from "@/lib/db/queries/notion-pages";
import { NotionOAuthResponse } from "@/lib/notion/types";
import { NotionClient } from "@/lib/notion/client";

// ========================
// USER OPERATIONS
// ========================

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  return await getUserByClerkId(clerkId);
}

export async function ensureUserExists(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  return await getUserOrCreate({
    clerkId,
    ...userData,
  });
}

export async function updateUserPreferences(preferences: {
  theme?: "light" | "dark";
  notifications?: boolean;
  language?: string;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const user = await updateUser(clerkId, { preferences });
  revalidatePath("/settings");
  return user;
}

// ========================
// NOTION ACCOUNT OPERATIONS
// ========================

export async function createNotionAccount(oauthData: NotionOAuthResponse) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }

  try {
    const account = await createNotionAccountDB({
      userId: user.id,
      workspaceName: oauthData.workspace_name,
      workspaceId: oauthData.workspace_id,
      workspaceIcon: oauthData.workspace_icon,
      accessToken: oauthData.access_token,
      botId: oauthData.bot_id,
      owner: oauthData.owner,
      duplicatedTemplateId: oauthData.duplicated_template_id,
      requestId: oauthData.request_id,
    });

    revalidatePath("/settings");
    return account;
  } catch (error) {
    console.error("Error creating Notion account:", error);
    throw new Error("Failed to create Notion account");
  }
}

export async function getUserNotionAccounts() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  return await getNotionAccountsByUserId(user.id);
}

export async function removeNotionAccount(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await deleteNotionAccount(user.id, accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error removing Notion account:", error);
    throw new Error("Failed to remove Notion account");
  }
}

export async function updateNotionAccountStatus(
  accountId: string,
  status: "connected" | "disconnected" | "error"
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const account = await updateNotionAccount(accountId, { status });
  revalidatePath("/settings");
  return account;
}

export async function recordNotionSync(
  accountId: string,
  success: boolean,
  error?: string
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (success) {
    await updateLastSync(accountId, new Date());
    await updateSyncError(accountId, null);
  } else {
    await updateSyncError(accountId, error || "Unknown sync error");
  }

  revalidatePath("/settings");
}

// ========================
// NOTION INTEGRATION STATS
// ========================

export async function getNotionIntegrationStats(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const databases = await getNotionDatabasesByAccountId(accountId);
    const pages = await getNotionPagesByAccountId(accountId);
    const account = await getNotionAccountById(accountId);

    return {
      totalDatabases: databases.length,
      totalPages: pages.length,
      lastSync: account?.lastSync || null,
      syncErrors: account?.syncError ? 1 : 0,
    };
  } catch (error) {
    console.error("Error getting integration stats:", error);
    return {
      totalDatabases: 0,
      totalPages: 0,
      lastSync: null,
      syncErrors: 1,
    };
  }
}

// ========================
// SYNC HELPER FUNCTIONS
// ========================

async function syncDatabases(
  client: NotionClient,
  accountId: string
): Promise<void> {
  console.log(`Starting database sync for account ${accountId}`);

  try {
    const notionDatabases = await client.getDatabases();
    console.log(`Found ${notionDatabases.length} databases from Notion`);

    for (const notionDb of notionDatabases) {
      try {
        await upsertNotionDatabase({
          accountId,
          notionId: notionDb.id,
          title: notionDb.title,
          description: (notionDb as any).description,
          url: notionDb.url,
          cover: notionDb.cover,
          icon: notionDb.icon,
          properties: notionDb.properties,
          parent: notionDb.parent,
          archived: (notionDb as any).archived ? "true" : "false",
          inTrash: (notionDb as any).in_trash ? "true" : "false",
          isInline: (notionDb as any).is_inline ? "true" : "false",
          publicUrl: (notionDb as any).public_url,
          pageCount: 0, // We'll update this when syncing pages
          lastEditedTime: new Date(notionDb.lastEditedTime),
          createdTime: new Date((notionDb as any).created_time),
        });
        console.log(`Synced database: ${notionDb.title}`);
      } catch (error) {
        console.error(`Error syncing database ${notionDb.title}:`, error);
      }
    }

    console.log(`Database sync completed for account ${accountId}`);
  } catch (error) {
    console.error(`Database sync failed for account ${accountId}:`, error);
    throw error;
  }
}

async function syncPages(
  client: NotionClient,
  accountId: string
): Promise<void> {
  console.log(`Starting page sync for account ${accountId}`);

  try {
    const notionPages = await client.getPages();
    console.log(`Found ${notionPages.length} pages from Notion`);

    for (const notionPage of notionPages) {
      try {
        // Get page content (blocks)
        let content = null;
        try {
          content = await client.getPageContent(notionPage.id);
        } catch (error) {
          console.warn(
            `Could not fetch content for page ${notionPage.title}:`,
            error
          );
        }

        await upsertNotionPage({
          accountId,
          notionId: notionPage.id,
          title: notionPage.title,
          url: notionPage.url,
          cover: notionPage.cover,
          icon: notionPage.icon,
          parent: notionPage.parent,
          properties: notionPage.properties,
          content: content,
          archived: (notionPage as any).archived ? "true" : "false",
          inTrash: (notionPage as any).in_trash ? "true" : "false",
          publicUrl: (notionPage as any).public_url,
          lastEditedTime: new Date(notionPage.lastEditedTime),
          createdTime: new Date((notionPage as any).created_time),
        });
        console.log(`Synced page: ${notionPage.title}`);
      } catch (error) {
        console.error(`Error syncing page ${notionPage.title}:`, error);
      }
    }

    console.log(`Page sync completed for account ${accountId}`);
  } catch (error) {
    console.error(`Page sync failed for account ${accountId}:`, error);
    throw error;
  }
}

// ========================
// NOTION OAUTH HELPERS
// ========================

export async function exchangeNotionCode(
  code: string
): Promise<NotionOAuthResponse> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Notion OAuth configuration");
  }

  // Notion requires Basic authentication for token exchange
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const requestBody = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
  };

  console.log("OAuth request with Basic auth:", {
    grant_type: requestBody.grant_type,
    code: code?.substring(0, 10) + "...",
    redirect_uri: requestBody.redirect_uri,
    hasBasicAuth: true,
  });

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Notion OAuth error:", error);
    console.error("Response status:", response.status);
    throw new Error(
      `Failed to exchange authorization code: ${response.status} - ${error}`
    );
  }

  const result = await response.json();
  console.log("OAuth success! Received workspace:", result.workspace_name);

  return result;
}

// ========================
// BACKGROUND SYNC OPERATIONS
// ========================

export async function syncNotionAccount(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const account = await getNotionAccountById(accountId);
  if (!account || account.userId !== user.id) {
    throw new Error("Account not found or unauthorized");
  }

  try {
    const notionClient = new NotionClient(account.accessToken);
    await syncDatabases(notionClient, accountId);
    await syncPages(notionClient, accountId);

    await recordNotionSync(accountId, true);
    return { success: true };
  } catch (error) {
    console.error("Sync error:", error);
    await recordNotionSync(
      accountId,
      false,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

export async function syncAllNotionAccounts() {
  const accounts = await getUserNotionAccounts();
  const results = [];

  for (const account of accounts) {
    try {
      await syncNotionAccount(account.id);
      results.push({ accountId: account.id, success: true });
    } catch (error) {
      results.push({
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  revalidatePath("/settings");
  return results;
}

export async function triggerNotionSync(accountId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await syncNotionAccount(accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Manual sync failed:", error);
    throw new Error("Failed to sync Notion account");
  }
}
