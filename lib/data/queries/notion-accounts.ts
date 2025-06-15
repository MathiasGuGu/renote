import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/config";
import { notionAccounts } from "../../db/schema/notion-accounts";
import type { NotionAccount } from "@/lib/integrations/notion/types";

export async function createNotionAccount(accountData: {
  userId: string;
  workspaceName: string;
  workspaceId: string;
  workspaceIcon?: string;
  accessToken: string;
  botId: string;
  owner?: any;
  duplicatedTemplateId?: string;
  requestId?: string;
}): Promise<NotionAccount> {
  const [account] = await db
    .insert(notionAccounts)
    .values({
      userId: accountData.userId,
      workspaceName: accountData.workspaceName,
      workspaceId: accountData.workspaceId,
      workspaceIcon: accountData.workspaceIcon,
      accessToken: accountData.accessToken,
      botId: accountData.botId,
      owner: accountData.owner,
      duplicatedTemplateId: accountData.duplicatedTemplateId,
      requestId: accountData.requestId,
      status: "connected",
    })
    .returning();

  return account;
}

export async function getNotionAccountsByUserId(
  userId: string
): Promise<NotionAccount[]> {
  return db
    .select()
    .from(notionAccounts)
    .where(eq(notionAccounts.userId, userId))
    .orderBy(desc(notionAccounts.createdAt));
}

export async function getNotionAccountByAccountId(
  accountId: string
): Promise<NotionAccount | null> {
  const [account] = await db
    .select()
    .from(notionAccounts)
    .where(eq(notionAccounts.id, accountId))
    .limit(1);

  return account || null;
}

export async function updateNotionAccount(
  accountId: string,
  updates: Partial<
    Omit<NotionAccount, "id" | "userId" | "createdAt" | "updatedAt">
  >
): Promise<NotionAccount | null> {
  const [account] = await db
    .update(notionAccounts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(notionAccounts.id, accountId))
    .returning();

  return account || null;
}

export async function deleteNotionAccount(
  userId: string,
  accountId: string
): Promise<void> {
  await db
    .delete(notionAccounts)
    .where(
      and(eq(notionAccounts.id, accountId), eq(notionAccounts.userId, userId))
    );
}

export async function updateLastSync(
  accountId: string,
  lastSync: Date
): Promise<void> {
  await db
    .update(notionAccounts)
    .set({
      lastSync,
      updatedAt: new Date(),
    })
    .where(eq(notionAccounts.id, accountId));
}

export async function updateSyncError(
  accountId: string,
  error: string | null
): Promise<void> {
  await db
    .update(notionAccounts)
    .set({
      syncError: error,
      status: error ? "error" : "connected",
      updatedAt: new Date(),
    })
    .where(eq(notionAccounts.id, accountId));
}
