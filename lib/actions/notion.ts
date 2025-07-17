"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotionAccountInDatabase, deleteNotionAccountInDatabase } from "../data/notion";
import { NotionOauthResponse } from "../integrations/notion/types";

export async function exchangeNotionCode(
  code: string
): Promise<NotionOauthResponse> {
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

  return await response.json();
}


export async function createNotionAccount(oauthData: NotionOauthResponse) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }


  try {
    const account = await createNotionAccountInDatabase({
      clerkId: userId,
      oauthData,
    });

    revalidatePath("/settings");
    return account;
  } catch (error) {
    throw new Error("Failed to create Notion account");
  }
}

export async function deleteNotionAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not found");
  }
  try {
    await deleteNotionAccountInDatabase(accountId);
    revalidatePath("/settings");
  } catch (error) {
    throw new Error("Failed to delete Notion account");
  }
}
