import { eq } from "drizzle-orm";
import { db } from "../db/config";
import { notionAccounts} from "../db/schema";
import { getUserByClerkId } from "./user";
import { NotionAccountsDatabaseReturn } from "../db/types";
import { NotionOauthResponse } from "../integrations/notion/types";



export async function createNotionAccountInDatabase({
  oauthData,
  clerkId,
}: {
  oauthData: NotionOauthResponse;
  clerkId: string;
}) {
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }
  const account = await db.insert(notionAccounts).values({
    userId: user.id,
    workspaceName: oauthData.workspace_name,
    workspaceId: oauthData.workspace_id,
    workspaceIcon: oauthData.workspace_icon || null,
    accessToken: oauthData.access_token,
    botId: oauthData.bot_id,
    owner: oauthData.owner || null,
    duplicatedTemplateId: oauthData.duplicated_template_id || null,
    status: "connected" as const,
  } as NotionAccountsDatabaseReturn).returning();

  return account;
}

export async function deleteNotionAccountInDatabase(accountId: string) {
  const account = await db.delete(notionAccounts).where(eq(notionAccounts.id, accountId));
  return account;
}

export async function getNotionAccountsByClerkId(clerkId: string) {
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }
  const accounts = await db.select().from(notionAccounts).where(eq(notionAccounts.userId, user.id));
  return accounts;
}
