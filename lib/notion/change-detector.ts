import {
  generateContentHash,
  generateTitleHash,
  generatePropertiesHash,
  hasContentChanged,
  extractTextFromNotionBlocks,
  shouldProcessContent,
  calculateContentQuality,
} from "@/lib/utils";

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFields: string[];
  requiresProcessing: boolean;
  processingPriority: number;
  contentQuality: number;
  extractedText: string;
  hashes: {
    content: string;
    title: string;
    properties: string;
  };
}

export interface NotionPageData {
  title: string;
  content: any;
  properties: any;
  lastEditedTime: Date;
}

export interface StoredPageData {
  contentHash?: string | null;
  titleHash?: string | null;
  propertiesHash?: string | null;
  lastProcessedHash?: string | null;
  lastProcessedAt?: Date | null;
  processingVersion?: number | null;
  lastEditedTime: Date;
}

/**
 * Phase 3: Change Detection & Incremental Processing Service
 */
export class NotionChangeDetector {
  /**
   * Detect changes in a Notion page compared to stored version
   */
  static detectChanges(
    currentPage: NotionPageData,
    storedPage: StoredPageData
  ): ChangeDetectionResult {
    // Generate hashes for current content
    const currentHashes = {
      content: generateContentHash(currentPage.content),
      title: generateTitleHash(currentPage.title),
      properties: generatePropertiesHash(currentPage.properties),
    };

    // Check what has changed
    const changedFields: string[] = [];

    if (hasContentChanged(currentHashes.content, storedPage.contentHash)) {
      changedFields.push("content");
    }

    if (hasContentChanged(currentHashes.title, storedPage.titleHash)) {
      changedFields.push("title");
    }

    if (
      hasContentChanged(currentHashes.properties, storedPage.propertiesHash)
    ) {
      changedFields.push("properties");
    }

    // Check if Notion's lastEditedTime is newer
    const notionTimestampChanged =
      currentPage.lastEditedTime > storedPage.lastEditedTime;

    if (notionTimestampChanged && changedFields.length === 0) {
      // Notion says it changed but we don't detect content changes
      // This might be a minor change like formatting
      changedFields.push("metadata");
    }

    const hasChanges = changedFields.length > 0;

    // Extract text content for analysis
    const extractedText = extractTextFromNotionBlocks(
      currentPage.content?.results || []
    );

    // Calculate content quality and processing priority
    const contentQuality = calculateContentQuality(extractedText);

    // Determine if content requires processing
    const requiresProcessing =
      hasChanges && shouldProcessContent(extractedText);

    // Calculate processing priority (0-100, higher = more important)
    let processingPriority = 0;

    if (requiresProcessing) {
      // Base priority on content quality
      processingPriority += contentQuality * 0.4;

      // Boost priority based on change significance
      if (changedFields.includes("content")) processingPriority += 40;
      if (changedFields.includes("title")) processingPriority += 20;
      if (changedFields.includes("properties")) processingPriority += 10;

      // Boost priority if never processed before
      if (!storedPage.lastProcessedAt) processingPriority += 20;

      // Reduce priority if recently processed
      if (storedPage.lastProcessedAt) {
        const daysSinceProcessed =
          (Date.now() - storedPage.lastProcessedAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceProcessed < 1) processingPriority *= 0.5;
        else if (daysSinceProcessed < 7) processingPriority *= 0.8;
      }

      processingPriority = Math.min(Math.max(processingPriority, 0), 100);
    }

    return {
      hasChanges,
      changedFields,
      requiresProcessing,
      processingPriority,
      contentQuality,
      extractedText,
      hashes: currentHashes,
    };
  }

  /**
   * Check if a page needs reprocessing based on content changes
   */
  static needsReprocessing(
    currentContentHash: string,
    lastProcessedHash: string | null | undefined,
    lastProcessedAt: Date | null | undefined,
    maxAge: number = 30 // days
  ): boolean {
    // Always reprocess if never processed
    if (!lastProcessedAt || !lastProcessedHash) return true;

    // Reprocess if content has changed
    if (currentContentHash !== lastProcessedHash) return true;

    // Reprocess if too old (content might be stale)
    const daysSinceProcessed =
      (Date.now() - lastProcessedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceProcessed > maxAge) return true;

    return false;
  }

  /**
   * Determine processing strategy based on changes
   */
  static getProcessingStrategy(result: ChangeDetectionResult): {
    strategy: "full" | "incremental" | "skip";
    reason: string;
  } {
    if (!result.requiresProcessing) {
      return {
        strategy: "skip",
        reason: "No significant changes or low quality content",
      };
    }

    if (result.changedFields.includes("content")) {
      if (result.contentQuality > 70) {
        return {
          strategy: "full",
          reason: "High quality content with significant changes",
        };
      } else {
        return {
          strategy: "incremental",
          reason: "Content changed but quality is moderate",
        };
      }
    }

    if (result.changedFields.includes("title")) {
      return {
        strategy: "incremental",
        reason: "Title changed, may affect question context",
      };
    }

    return { strategy: "incremental", reason: "Minor changes detected" };
  }

  /**
   * Generate processing metadata for job queue
   */
  static generateProcessingMetadata(
    pageId: string,
    result: ChangeDetectionResult
  ): any {
    const strategy = this.getProcessingStrategy(result);

    return {
      pageId,
      processingStrategy: strategy.strategy,
      processingReason: strategy.reason,
      priority: result.processingPriority,
      contentQuality: result.contentQuality,
      changedFields: result.changedFields,
      extractedTextLength: result.extractedText.length,
      hashes: result.hashes,
      detectedAt: new Date().toISOString(),
    };
  }
}

/**
 * Batch change detection for multiple pages
 */
export async function detectBatchChanges(
  pages: Array<{ current: NotionPageData; stored: StoredPageData; id: string }>
): Promise<Array<{ pageId: string; result: ChangeDetectionResult }>> {
  return pages.map(({ current, stored, id }) => ({
    pageId: id,
    result: NotionChangeDetector.detectChanges(current, stored),
  }));
}

/**
 * Filter pages that need processing and sort by priority
 */
export function prioritizeChangedPages(
  results: Array<{ pageId: string; result: ChangeDetectionResult }>
): Array<{ pageId: string; result: ChangeDetectionResult }> {
  return results
    .filter(({ result }) => result.requiresProcessing)
    .sort((a, b) => b.result.processingPriority - a.result.processingPriority);
}
