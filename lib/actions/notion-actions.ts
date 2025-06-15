"use server";

import { auth } from "@clerk/nextjs/server";
import { NotionOAuthResponse, NotionPage } from "../integrations/notion";
import {
  createNotionAccount as createNotionAccountDB,
  getNotionAccountsByUserId,
  getNotionPagesForUser,
  getUserByClerkId,
} from "../data/queries";
import { revalidatePath } from "next/cache";
import {
  addJob,
  QUEUE_NAMES,
  SyncJobData,
} from "../infrastructure/queue/queue";

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
    throw new Error(
      `Failed to exchange authorization code: ${response.status} - ${error}`
    );
  }

  const result = await response.json();
  return result;
}

export async function createNotionAccount(oauthData: NotionOAuthResponse) {
  const { userId } = await auth();
  const user = await getUserByClerkId(userId!);
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
    throw new Error("Failed to create Notion account");
  }
}
