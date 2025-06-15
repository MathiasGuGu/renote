import { getUserByClerkId } from "./users";
import {
  getNotionAccountsByUserId,
  createNotionAccount,
  updateNotionAccount,
  deleteNotionAccount,
} from "./notion-accounts";
import { getNotionDatabasesByAccountId } from "./notion-databases";
import { getNotionPagesByAccountId } from "./notion-pages";
import type { NotionAccount } from "@/lib/integrations/notion/types";

/**
 * Unified Notion queries that work with clerkId instead of internal IDs
 * This abstracts away the complexity of managing multiple ID types
 */

export async function getNotionAccountsForUser(
  clerkId: string
): Promise<NotionAccount[]> {
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error(`User not found for clerkId: ${clerkId}`);
  }

  return getNotionAccountsByUserId(user.id);
}

export async function createNotionAccountForUser(
  clerkId: string,
  accountData: Omit<Parameters<typeof createNotionAccount>[0], "userId">
): Promise<NotionAccount> {
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error(`User not found for clerkId: ${clerkId}`);
  }

  return createNotionAccount({
    ...accountData,
    userId: user.id,
  });
}

export async function getNotionDatabasesForUser(clerkId: string) {
  const accounts = await getNotionAccountsForUser(clerkId);

  // Get databases for all accounts
  const allDatabases = await Promise.all(
    accounts.map(account => getNotionDatabasesByAccountId(account.id))
  );

  return allDatabases.flat();
}

export async function getNotionPagesForUser(clerkId: string) {
  const accounts = await getNotionAccountsForUser(clerkId);

  // Get pages for all accounts
  const allPages = await Promise.all(
    accounts.map(account => getNotionPagesByAccountId(account.id))
  );

  return allPages.flat();
}

export async function getNotionDataForAccount(
  clerkId: string,
  workspaceId: string
) {
  const accounts = await getNotionAccountsForUser(clerkId);
  const account = accounts.find(acc => acc.workspaceId === workspaceId);

  if (!account) {
    throw new Error(`Notion account not found for workspace: ${workspaceId}`);
  }

  const [databases, pages] = await Promise.all([
    getNotionDatabasesByAccountId(account.id),
    getNotionPagesByAccountId(account.id),
  ]);

  return {
    account,
    databases,
    pages,
  };
}

export async function updateNotionAccountForUser(
  clerkId: string,
  workspaceId: string,
  updates: Parameters<typeof updateNotionAccount>[1]
) {
  const accounts = await getNotionAccountsForUser(clerkId);
  const account = accounts.find(acc => acc.workspaceId === workspaceId);

  if (!account) {
    throw new Error(`Notion account not found for workspace: ${workspaceId}`);
  }

  return updateNotionAccount(account.id, updates);
}

export async function deleteNotionAccountForUser(
  clerkId: string,
  workspaceId: string
) {
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error(`User not found for clerkId: ${clerkId}`);
  }

  const accounts = await getNotionAccountsForUser(clerkId);
  const account = accounts.find(acc => acc.workspaceId === workspaceId);

  if (!account) {
    throw new Error(`Notion account not found for workspace: ${workspaceId}`);
  }

  return deleteNotionAccount(user.id, account.id);
}
