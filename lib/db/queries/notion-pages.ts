import { eq, and, desc, isNull, not } from "drizzle-orm";
import { db } from "../config";
import { notionPages } from "../schema/notion-pages";

export type NotionPage = {
  id: string;
  accountId: string;
  notionId: string;
  title: string;
  url: string;
  cover?: any | null;
  icon?: any | null;
  parent?: any | null;
  properties?: any | null;
  content?: any | null;
  archived?: string | null;
  inTrash?: string | null;
  publicUrl?: string | null;
  lastEditedTime: Date;
  createdTime: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Phase 3: Change detection fields
  contentHash?: string | null;
  propertiesHash?: string | null;
  titleHash?: string | null;
  lastProcessedAt?: Date | null;
  lastProcessedHash?: string | null;
  processingVersion?: number | null;
  changeDetectedAt?: Date | null;
  requiresProcessing?: string | null;
};

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
  // Phase 3: Change detection data
  contentHash?: string;
  propertiesHash?: string;
  titleHash?: string;
  requiresProcessing?: string;
  changeDetectedAt?: Date;
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
      // Phase 3 fields
      contentHash: data.contentHash,
      propertiesHash: data.propertiesHash,
      titleHash: data.titleHash,
      requiresProcessing: data.requiresProcessing || "false",
      changeDetectedAt: data.changeDetectedAt,
      processingVersion: 1,
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
    // Phase 3: Change detection updates
    contentHash: string;
    propertiesHash: string;
    titleHash: string;
    lastProcessedAt: Date;
    lastProcessedHash: string;
    processingVersion: number;
    changeDetectedAt: Date;
    requiresProcessing: string;
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
  // Phase 3: Change detection data
  contentHash?: string;
  propertiesHash?: string;
  titleHash?: string;
  requiresProcessing?: string;
  changeDetectedAt?: Date;
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
      // Phase 3 updates
      contentHash: data.contentHash,
      propertiesHash: data.propertiesHash,
      titleHash: data.titleHash,
      requiresProcessing: data.requiresProcessing || "false",
      changeDetectedAt: data.changeDetectedAt,
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

// Phase 3: Change Detection Queries

/**
 * Get pages that require processing (have changes detected)
 */
export async function getPagesRequiringProcessing(
  accountId?: string,
  limit: number = 50
): Promise<NotionPage[]> {
  const query = db
    .select()
    .from(notionPages)
    .where(
      and(
        eq(notionPages.requiresProcessing, "true"),
        accountId ? eq(notionPages.accountId, accountId) : undefined
      )
    )
    .orderBy(desc(notionPages.changeDetectedAt))
    .limit(limit);

  const pages = await query;
  return pages as NotionPage[];
}

/**
 * Get pages that have never been processed
 */
export async function getUnprocessedPages(
  accountId?: string,
  limit: number = 50
): Promise<NotionPage[]> {
  const query = db
    .select()
    .from(notionPages)
    .where(
      and(
        isNull(notionPages.lastProcessedAt),
        accountId ? eq(notionPages.accountId, accountId) : undefined
      )
    )
    .orderBy(desc(notionPages.lastEditedTime))
    .limit(limit);

  const pages = await query;
  return pages as NotionPage[];
}

/**
 * Mark page as processed
 */
export async function markPageAsProcessed(
  pageId: string,
  contentHash: string,
  processingVersion?: number
): Promise<NotionPage> {
  const [page] = await db
    .update(notionPages)
    .set({
      lastProcessedAt: new Date(),
      lastProcessedHash: contentHash,
      requiresProcessing: "false",
      processingVersion: processingVersion || 1,
      updatedAt: new Date(),
    })
    .where(eq(notionPages.id, pageId))
    .returning();

  return page as NotionPage;
}

/**
 * Mark pages as requiring processing (batch operation)
 */
export async function markPagesForProcessing(
  pageIds: string[],
  changeDetectedAt: Date = new Date()
): Promise<void> {
  if (pageIds.length === 0) return;

  // Process in batches to avoid SQL query length limits
  for (const pageId of pageIds) {
    await db
      .update(notionPages)
      .set({
        requiresProcessing: "true",
        changeDetectedAt,
        updatedAt: new Date(),
      })
      .where(eq(notionPages.id, pageId));
  }
}

/**
 * Get processing statistics for an account
 */
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
    .where(
      and(
        eq(notionPages.accountId, accountId),
        not(isNull(notionPages.lastProcessedAt))
      )
    );

  const pendingPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(
      and(
        eq(notionPages.accountId, accountId),
        eq(notionPages.requiresProcessing, "true")
      )
    );

  const unprocessedPages = await db
    .select({ count: notionPages.id })
    .from(notionPages)
    .where(
      and(
        eq(notionPages.accountId, accountId),
        isNull(notionPages.lastProcessedAt)
      )
    );

  return {
    totalPages: totalPages.length,
    processedPages: processedPages.length,
    pendingPages: pendingPages.length,
    unprocessedPages: unprocessedPages.length,
  };
}
