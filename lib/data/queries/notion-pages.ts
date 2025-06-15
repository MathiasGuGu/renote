import { eq, and, desc, isNull, not } from "drizzle-orm";
import { db } from "../../db/config";

export async function createNotionPage() {}
export async function getNotionPagesByAccountId() {}
export async function getNotionPageById() {}
export async function getNotionPageByNotionId() {}
export async function updateNotionPage() {}
export async function upsertNotionPage() {}
export async function deleteNotionPage() {}
export async function deleteNotionPagesByAccountId() {}
export async function searchNotionPages() {}
export async function getPagesRequiringProcessing() {}
export async function getUnprocessedPages() {}
export async function markPageAsProcessed() {}
export async function markPagesForProcessing() {}
export async function getProcessingStats() {}
