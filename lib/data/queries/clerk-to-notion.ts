/*
===============================================
Unified query system for interacting with Notion through only clerk.
===============================================

This uses the other queries to handle everything but only requires the clerkId instead of "userId" or "notionAccountId"

For specific use cases, you can use the other queries directly.

Queries available:
 - getNotionAccountWithClerkId: Get a Notion account by clerkId
 - getNotionDatabasesWithClerkId: Get all Notion databases by clerkId
 - getNotionPagesWithClerkId: Get all Notion pages by clerkId
 - createNotionAccountForClerkId: Create a Notion account for a clerkId
 - createNotionDatabaseForClerkId: Create a Notion database for a clerkId
 - createNotionPageForClerkId: Create a Notion page for a clerkId
 - updateNotionAccountForClerkId: Update a Notion account for a clerkId
 - updateNotionDatabaseForClerkId: Update a Notion database for a clerkId
 - updateNotionPageForClerkId: Update a Notion page for a clerkId
 - deleteNotionAccountForClerkId: Delete a Notion account for a clerkId

*/

import { auth } from "@clerk/nextjs/server";
import { NotionUser } from "../../integrations/notion/types";
import { getUserIdByClerkId } from "./renote-users";
import { db } from "../../db/config";
import { notionAccounts, notionDatabases, notionPages } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  NotionDatabasesDatabaseReturn,
  NotionPagesDatabaseReturn,
} from "@/lib/db/types";

export async function getNotionAccountWithClerkId(): Promise<
  string | undefined
> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }
  const user = await getUserIdByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }
  const notionAccount = await db.query.notionAccounts.findFirst({
    where: eq(notionAccounts.userId, user),
  });
  return notionAccount?.id;
}

export async function getNotionDatabasesWithClerkId(): Promise<
  NotionDatabasesDatabaseReturn[]
> {
  const notionId = await getNotionAccountWithClerkId();
  if (!notionId) {
    throw new Error("User not found");
  }
  const notionsDbs: NotionDatabasesDatabaseReturn[] =
    await db.query.notionDatabases.findMany({
      where: eq(notionDatabases.accountId, notionId),
    });

  return notionsDbs;
}

export async function getNotionPagesWithClerkId(): Promise<
  NotionPagesDatabaseReturn[]
> {
  const notionId = await getNotionAccountWithClerkId();
  if (!notionId) {
    throw new Error("User not found");
  }
  const notionsPages: NotionPagesDatabaseReturn[] =
    await db.query.notionPages.findMany({
      where: eq(notionPages.accountId, notionId),
    });
  return notionsPages;
}

export async function createNotionAccountForClerkId() {}
export async function createNotionDatabaseForClerkId() {}
export async function createNotionPageForClerkId() {}
export async function updateNotionAccountForClerkId() {}
export async function updateNotionDatabaseForClerkId() {}
export async function updateNotionPageForClerkId() {}
export async function deleteNotionAccountForClerkId() {}
