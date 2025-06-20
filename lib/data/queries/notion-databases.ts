import { eq, desc } from "drizzle-orm";
import { db } from "../../db/config";
import { auth } from "@clerk/nextjs/server";
import { notionDatabases } from "../../db/schema";
import { NotionDatabase } from "../../integrations/notion/types";
import { getUserIdByClerkId } from "./renote-users";
import {
  NotionAccountsDatabaseReturn,
  NotionDatabasesDatabaseReturn,
} from "@/lib/db/types";

export async function createNotionDatabase() {}
export async function getNotionDatabasesByAccountId() {}
export async function getNotionDatabaseById() {}

export async function updateNotionDatabase() {}
export async function upsertNotionDatabase() {}
export async function deleteNotionDatabase() {}
export async function deleteNotionDatabasesByAccountId() {}
