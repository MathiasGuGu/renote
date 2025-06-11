import { eq, and, desc } from "drizzle-orm";
import { db } from "../config";
import { notionDatabases } from "../schema/notion-databases";
import { NotionDatabase } from "@/lib/notion/types";

export async function createNotionDatabase(data: {
  accountId: string;
  notionId: string;
  title: string;
  description?: string;
  url: string;
  cover?: any;
  icon?: any;
  properties: any;
  parent?: any;
  archived?: string;
  inTrash?: string;
  isInline?: string;
  publicUrl?: string;
  pageCount?: number;
  lastEditedTime: Date;
  createdTime: Date;
}): Promise<NotionDatabase> {
  const [database] = await db
    .insert(notionDatabases)
    .values({
      accountId: data.accountId,
      notionId: data.notionId,
      title: data.title,
      description: data.description,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      properties: data.properties,
      parent: data.parent,
      archived: data.archived || "false",
      inTrash: data.inTrash || "false",
      isInline: data.isInline || "false",
      publicUrl: data.publicUrl,
      pageCount: data.pageCount || 0,
      lastEditedTime: data.lastEditedTime,
      createdTime: data.createdTime,
    })
    .returning();

  return database as NotionDatabase;
}

export async function getNotionDatabasesByAccountId(
  accountId: string
): Promise<NotionDatabase[]> {
  const databases = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.accountId, accountId))
    .orderBy(desc(notionDatabases.lastEditedTime));

  return databases as NotionDatabase[];
}

export async function getNotionDatabaseById(
  id: string
): Promise<NotionDatabase | null> {
  const [database] = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.id, id))
    .limit(1);

  return database ? (database as NotionDatabase) : null;
}

export async function getNotionDatabaseByNotionId(
  notionId: string
): Promise<NotionDatabase | null> {
  const [database] = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.notionId, notionId))
    .limit(1);

  return database ? (database as NotionDatabase) : null;
}

export async function updateNotionDatabase(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    url: string;
    cover: any;
    icon: any;
    properties: any;
    parent: any;
    archived: string;
    inTrash: string;
    isInline: string;
    publicUrl: string;
    pageCount: number;
    lastEditedTime: Date;
    lastSyncedAt: Date;
  }>
): Promise<NotionDatabase> {
  const [database] = await db
    .update(notionDatabases)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(notionDatabases.id, id))
    .returning();

  return database as NotionDatabase;
}

export async function upsertNotionDatabase(data: {
  accountId: string;
  notionId: string;
  title: string;
  description?: string;
  url: string;
  cover?: any;
  icon?: any;
  properties: any;
  parent?: any;
  archived?: string;
  inTrash?: string;
  isInline?: string;
  publicUrl?: string;
  pageCount?: number;
  lastEditedTime: Date;
  createdTime: Date;
}): Promise<NotionDatabase> {
  // First try to find existing database
  const existing = await getNotionDatabaseByNotionId(data.notionId);

  if (existing) {
    // Update existing database
    return await updateNotionDatabase(existing.id, {
      title: data.title,
      description: data.description,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      properties: data.properties,
      parent: data.parent,
      archived: data.archived || "false",
      inTrash: data.inTrash || "false",
      isInline: data.isInline || "false",
      publicUrl: data.publicUrl,
      pageCount: data.pageCount || 0,
      lastEditedTime: data.lastEditedTime,
      lastSyncedAt: new Date(),
    });
  } else {
    // Create new database
    return await createNotionDatabase(data);
  }
}

export async function deleteNotionDatabase(id: string): Promise<void> {
  await db.delete(notionDatabases).where(eq(notionDatabases.id, id));
}

export async function deleteNotionDatabasesByAccountId(
  accountId: string
): Promise<void> {
  await db
    .delete(notionDatabases)
    .where(eq(notionDatabases.accountId, accountId));
}
