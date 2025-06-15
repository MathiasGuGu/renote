import { eq, desc } from "drizzle-orm";
import { db } from "../../db/config";
import { notionDatabases } from "../../db/schema/notion-databases";
import type {
  NotionDatabase,
  NotionProperty,
  NotionParent,
  NotionRichText,
} from "@/lib/integrations/notion/types";

export async function createNotionDatabase(
  data: NotionDatabase & { accountId: string }
): Promise<NotionDatabase> {
  const [database] = await db
    .insert(notionDatabases)
    .values({
      accountId: data.accountId,
      notionId: data.notionId,
      object: "database",
      title: data.title,
      description: data.description ?? [],
      url: data.url,
      cover: data.cover,
      icon: data.icon,
      properties: data.properties,
      parent: data.parent ?? { type: "workspace" },
      archived: data.archived ?? false,
      is_inline: data.is_inline ?? false,
      public_url: data.public_url ?? null,
      pageCount: 0,
      created_time: new Date(data.created_time),
      last_edited_time: new Date(data.last_edited_time),
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!database) {
    throw new Error("Failed to create database");
  }

  return {
    id: database.id,
    notionId: database.notionId,
    object: "database" as const,
    title: database.title,
    description: database.description ?? [],
    url: database.url,
    cover: database.cover,
    icon: database.icon,
    properties: database.properties as Record<string, NotionProperty>,
    parent: database.parent ?? { type: "workspace" },
    archived: database.archived ?? false,
    is_inline: database.is_inline ?? false,
    public_url: database.public_url ?? null,
    created_time: database.created_time.toISOString(),
    last_edited_time: database.last_edited_time.toISOString(),
  };
}

export async function getNotionDatabasesByAccountId(
  accountId: string
): Promise<NotionDatabase[]> {
  const databases = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.accountId, accountId))
    .orderBy(desc(notionDatabases.lastSyncedAt));

  return databases.map(db => ({
    id: db.id,
    notionId: db.notionId,
    object: "database" as const,
    title: db.title,
    description: db.description ?? [],
    url: db.url,
    cover: db.cover,
    icon: db.icon,
    properties: db.properties as Record<string, NotionProperty>,
    parent: db.parent ?? { type: "workspace" },
    archived: db.archived ?? false,
    is_inline: db.is_inline ?? false,
    public_url: db.public_url ?? null,
    created_time: db.created_time.toISOString(),
    last_edited_time: db.last_edited_time.toISOString(),
  }));
}

export async function getNotionDatabaseById(
  id: string
): Promise<NotionDatabase | null> {
  const [database] = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.id, id))
    .limit(1);

  if (!database) {
    return null;
  }

  return {
    id: database.id,
    notionId: database.notionId,
    object: "database" as const,
    title: database.title,
    description: database.description ?? [],
    url: database.url,
    cover: database.cover,
    icon: database.icon,
    properties: database.properties as Record<string, NotionProperty>,
    parent: database.parent ?? { type: "workspace" },
    archived: database.archived ?? false,
    is_inline: database.is_inline ?? false,
    public_url: database.public_url ?? null,
    created_time: database.created_time.toISOString(),
    last_edited_time: database.last_edited_time.toISOString(),
  };
}

export async function getNotionDatabaseByNotionId(
  notionId: string
): Promise<NotionDatabase | null> {
  const [database] = await db
    .select()
    .from(notionDatabases)
    .where(eq(notionDatabases.notionId, notionId))
    .limit(1);

  if (!database) {
    return null;
  }

  return {
    id: database.id,
    notionId: database.notionId,
    object: "database" as const,
    title: database.title,
    description: database.description ?? [],
    url: database.url,
    cover: database.cover,
    icon: database.icon,
    properties: database.properties as Record<string, NotionProperty>,
    parent: database.parent ?? { type: "workspace" },
    archived: database.archived ?? false,
    is_inline: database.is_inline ?? false,
    public_url: database.public_url ?? null,
    created_time: database.created_time.toISOString(),
    last_edited_time: database.last_edited_time.toISOString(),
  };
}

export async function updateNotionDatabase(
  id: string,
  data: Partial<{
    title: NotionRichText[];
    description: NotionRichText[];
    url: string;
    cover: any;
    icon: any;
    properties: Record<string, NotionProperty>;
    parent: NotionParent;
    archived: boolean;
    is_inline: boolean;
    public_url: string | null;
    pageCount: number;
    last_edited_time: Date;
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

  if (!database) {
    throw new Error("Database not found");
  }

  return {
    id: database.id,
    notionId: database.notionId,
    object: "database" as const,
    title: database.title,
    description: database.description ?? [],
    url: database.url,
    cover: database.cover,
    icon: database.icon,
    properties: database.properties as Record<string, NotionProperty>,
    parent: database.parent ?? { type: "workspace" },
    archived: database.archived ?? false,
    is_inline: database.is_inline ?? false,
    public_url: database.public_url ?? null,
    created_time: database.created_time.toISOString(),
    last_edited_time: database.last_edited_time.toISOString(),
  };
}

export async function upsertNotionDatabase(
  database: NotionDatabase & { accountId: string }
): Promise<NotionDatabase> {
  const [result] = await db
    .insert(notionDatabases)
    .values({
      accountId: database.accountId,
      notionId: database.notionId,
      object: "database",
      title: database.title,
      description: database.description ?? [],
      url: database.url,
      cover: database.cover,
      icon: database.icon,
      properties: database.properties,
      parent: database.parent ?? { type: "workspace" },
      archived: database.archived ?? false,
      is_inline: database.is_inline ?? false,
      public_url: database.public_url ?? null,
      pageCount: 0,
      created_time: new Date(database.created_time),
      last_edited_time: new Date(database.last_edited_time),
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [notionDatabases.notionId, notionDatabases.accountId],
      set: {
        title: database.title,
        description: database.description ?? [],
        url: database.url,
        cover: database.cover,
        icon: database.icon,
        properties: database.properties,
        parent: database.parent ?? { type: "workspace" },
        archived: database.archived ?? false,
        is_inline: database.is_inline ?? false,
        public_url: database.public_url ?? null,
        last_edited_time: new Date(database.last_edited_time),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!result) {
    throw new Error("Failed to upsert database");
  }

  return {
    id: result.id,
    notionId: result.notionId,
    object: "database" as const,
    title: result.title,
    description: result.description ?? [],
    url: result.url,
    cover: result.cover,
    icon: result.icon,
    properties: result.properties as Record<string, NotionProperty>,
    parent: result.parent ?? { type: "workspace" },
    archived: result.archived ?? false,
    is_inline: result.is_inline ?? false,
    public_url: result.public_url ?? null,
    created_time: result.created_time.toISOString(),
    last_edited_time: result.last_edited_time.toISOString(),
  };
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
