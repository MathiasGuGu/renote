import { eq, and, desc } from "drizzle-orm";
import { db } from "../config";
import { notionPages } from "../schema/notion-pages";
import { NotionPage } from "@/lib/notion/types";

export async function createNotionPage(data: {
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: any;
  icon?: any;
  parent?: any;
  properties?: any;
  content?: any;
  archived?: string;
  inTrash?: string;
  publicUrl?: string;
  lastEditedTime: Date;
  createdTime: Date;
}): Promise<NotionPage> {
  const [page] = await db
    .insert(notionPages)
    .values({
      accountId: data.accountId,
      notionId: data.notionId,
      title: data.title,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      parent: data.parent,
      properties: data.properties,
      content: data.content,
      archived: data.archived || "false",
      inTrash: data.inTrash || "false",
      publicUrl: data.publicUrl,
      lastEditedTime: data.lastEditedTime,
      createdTime: data.createdTime,
    })
    .returning();

  return page as NotionPage;
}

export async function getNotionPagesByAccountId(
  accountId: string
): Promise<NotionPage[]> {
  const pages = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId))
    .orderBy(desc(notionPages.lastEditedTime));

  return pages as NotionPage[];
}

export async function getNotionPageById(
  id: string
): Promise<NotionPage | null> {
  const [page] = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.id, id))
    .limit(1);

  return page ? (page as NotionPage) : null;
}

export async function getNotionPageByNotionId(
  notionId: string
): Promise<NotionPage | null> {
  const [page] = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.notionId, notionId))
    .limit(1);

  return page ? (page as NotionPage) : null;
}

export async function updateNotionPage(
  id: string,
  data: Partial<{
    title: string;
    url: string;
    cover: any;
    icon: any;
    parent: any;
    properties: any;
    content: any;
    archived: string;
    inTrash: string;
    publicUrl: string;
    lastEditedTime: Date;
    lastSyncedAt: Date;
  }>
): Promise<NotionPage> {
  const [page] = await db
    .update(notionPages)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(notionPages.id, id))
    .returning();

  return page as NotionPage;
}

export async function upsertNotionPage(data: {
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: any;
  icon?: any;
  parent?: any;
  properties?: any;
  content?: any;
  archived?: string;
  inTrash?: string;
  publicUrl?: string;
  lastEditedTime: Date;
  createdTime: Date;
}): Promise<NotionPage> {
  // First try to find existing page
  const existing = await getNotionPageByNotionId(data.notionId);

  if (existing) {
    // Update existing page
    return await updateNotionPage(existing.id, {
      title: data.title,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      parent: data.parent,
      properties: data.properties,
      content: data.content,
      archived: data.archived || "false",
      inTrash: data.inTrash || "false",
      publicUrl: data.publicUrl,
      lastEditedTime: data.lastEditedTime,
      lastSyncedAt: new Date(),
    });
  } else {
    // Create new page
    return await createNotionPage(data);
  }
}

export async function deleteNotionPage(id: string): Promise<void> {
  await db.delete(notionPages).where(eq(notionPages.id, id));
}

export async function deleteNotionPagesByAccountId(
  accountId: string
): Promise<void> {
  await db.delete(notionPages).where(eq(notionPages.accountId, accountId));
}

export async function searchNotionPages(
  accountId: string,
  query: string
): Promise<NotionPage[]> {
  const pages = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId))
    .orderBy(desc(notionPages.lastEditedTime));

  return pages.filter((page: NotionPage) =>
    page.title.toLowerCase().includes(query.toLowerCase())
  ) as NotionPage[];
}
