import { eq, and, desc, isNull, not } from "drizzle-orm";
import { db } from "../../db/config";
import { notionPages } from "../../db/schema/notion-pages";
import type {
  NotionPage,
  NotionProperty,
  NotionParent,
  NotionCover,
  NotionIcon,
} from "@/lib/integrations/notion/types";

// Extended type that includes our database fields
type NotionPageRecord = NotionPage & {
  title: string;
  content: any;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export async function createNotionPage(data: {
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: NotionCover | null;
  icon?: NotionIcon | null;
  parent?: NotionParent;
  properties?: Record<string, NotionProperty>;
  content?: any;
  archived?: boolean;
  public_url?: string;
  last_edited_time: Date;
  created_time: Date;
}): Promise<NotionPageRecord> {
  const [page] = await db
    .insert(notionPages)
    .values({
      accountId: data.accountId,
      notionId: data.notionId,
      object: "page",
      title: data.title,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      parent: data.parent ?? { type: "workspace" },
      properties: data.properties ?? {},
      content: data.content,
      archived: data.archived ?? false,
      public_url: data.public_url,
      last_edited_time: data.last_edited_time,
      created_time: data.created_time,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!page) {
    throw new Error("Failed to create page");
  }

  return {
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export async function getNotionPagesByAccountId(
  accountId: string
): Promise<NotionPageRecord[]> {
  const pages = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId))
    .orderBy(desc(notionPages.last_edited_time));

  return pages.map(page => ({
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }));
}

export async function getNotionPageById(
  pageId: string
): Promise<NotionPageRecord | null> {
  const [page] = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.id, pageId))
    .limit(1);

  if (!page) {
    return null;
  }

  return {
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export async function getNotionPageByNotionId(
  notionId: string
): Promise<NotionPageRecord | null> {
  const [page] = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.notionId, notionId))
    .limit(1);

  if (!page) {
    return null;
  }

  return {
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export async function updateNotionPage(
  pageId: string,
  data: Partial<{
    title: string;
    url: string;
    cover: NotionCover | null;
    icon: NotionIcon | null;
    parent: NotionParent;
    properties: Record<string, NotionProperty>;
    content: any;
    archived: boolean;
    public_url: string;
    last_edited_time: Date;
    lastSyncedAt: Date;
  }>
): Promise<NotionPageRecord> {
  const [page] = await db
    .update(notionPages)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(notionPages.id, pageId))
    .returning();

  if (!page) {
    throw new Error("Page not found");
  }

  return {
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export async function upsertNotionPage(data: {
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: NotionCover | null;
  icon?: NotionIcon | null;
  parent?: NotionParent;
  properties?: Record<string, NotionProperty>;
  content?: any;
  archived?: boolean;
  public_url?: string;
  last_edited_time: Date;
  created_time: Date;
}): Promise<NotionPageRecord> {
  const existing = await getNotionPageByNotionId(data.notionId);

  if (existing) {
    return await updateNotionPage(existing.id, {
      title: data.title,
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      parent: data.parent,
      properties: data.properties,
      content: data.content,
      archived: data.archived ?? false,
      public_url: data.public_url,
      last_edited_time: data.last_edited_time,
      lastSyncedAt: new Date(),
    });
  } else {
    return await createNotionPage(data);
  }
}

export async function deleteNotionPage(pageId: string): Promise<void> {
  await db.delete(notionPages).where(eq(notionPages.id, pageId));
}

export async function deleteNotionPagesByAccountId(
  accountId: string
): Promise<void> {
  await db.delete(notionPages).where(eq(notionPages.accountId, accountId));
}

export async function searchNotionPages(
  accountId: string,
  query: string
): Promise<NotionPageRecord[]> {
  const pages = await db
    .select()
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId))
    .orderBy(desc(notionPages.last_edited_time));

  return pages
    .filter(page => page.title.toLowerCase().includes(query.toLowerCase()))
    .map(page => ({
      id: page.id,
      notionId: page.notionId,
      object: "page" as const,
      title: page.title,
      url: page.url,
      cover: page.cover,
      icon: page.icon,
      parent: page.parent ?? { type: "workspace" },
      properties: page.properties as Record<string, NotionProperty>,
      content: page.content,
      archived: page.archived ?? false,
      public_url: page.public_url,
      created_time: page.created_time.toISOString(),
      last_edited_time: page.last_edited_time.toISOString(),
      lastSyncedAt: page.lastSyncedAt,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
}

export async function getPagesRequiringProcessing(
  accountId?: string,
  limit: number = 50
): Promise<NotionPageRecord[]> {
  const query = db
    .select()
    .from(notionPages)
    .where(accountId ? eq(notionPages.accountId, accountId) : undefined)
    .orderBy(desc(notionPages.last_edited_time))
    .limit(limit);

  const pages = await query;
  return pages.map(page => ({
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }));
}

export async function getUnprocessedPages(
  accountId?: string,
  limit: number = 50
): Promise<NotionPageRecord[]> {
  const query = db
    .select()
    .from(notionPages)
    .where(accountId ? eq(notionPages.accountId, accountId) : undefined)
    .orderBy(desc(notionPages.last_edited_time))
    .limit(limit);

  const pages = await query;
  return pages.map(page => ({
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }));
}

export async function markPageAsProcessed(
  pageId: string
): Promise<NotionPageRecord> {
  const [page] = await db
    .update(notionPages)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(notionPages.id, pageId))
    .returning();

  if (!page) {
    throw new Error("Page not found");
  }

  return {
    id: page.id,
    notionId: page.notionId,
    object: "page" as const,
    title: page.title,
    url: page.url,
    cover: page.cover,
    icon: page.icon,
    parent: page.parent ?? { type: "workspace" },
    properties: page.properties as Record<string, NotionProperty>,
    content: page.content,
    archived: page.archived ?? false,
    public_url: page.public_url,
    created_time: page.created_time.toISOString(),
    last_edited_time: page.last_edited_time.toISOString(),
    lastSyncedAt: page.lastSyncedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export async function markPagesForProcessing(pageIds: string[]): Promise<void> {
  if (pageIds.length === 0) return;

  // Process in batches to avoid SQL query length limits
  for (const pageId of pageIds) {
    await db
      .update(notionPages)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(notionPages.id, pageId));
  }
}

export async function getProcessingStats(accountId: string): Promise<{
  totalPages: number;
  processedPages: number;
  pendingPages: number;
  unprocessedPages: number;
}> {
  const totalPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId));

  const processedPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId));

  const pendingPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId));

  const unprocessedPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(eq(notionPages.accountId, accountId));

  return {
    totalPages: totalPages.length,
    processedPages: processedPages.length,
    pendingPages: pendingPages.length,
    unprocessedPages: unprocessedPages.length,
  };
}
