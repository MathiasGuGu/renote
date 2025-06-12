import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Phase 3: Content Hashing & Change Detection Utilities

/**
 * Generate MD5 hash of content for change detection
 */
export function generateContentHash(content: any): string {
  if (!content) return "";

  // Normalize content for consistent hashing
  const normalizedContent =
    typeof content === "string"
      ? content.trim()
      : JSON.stringify(content, Object.keys(content).sort());

  return createHash("md5").update(normalizedContent, "utf8").digest("hex");
}

/**
 * Generate hash for Notion page title
 */
export function generateTitleHash(title: string): string {
  return generateContentHash(title?.trim() || "");
}

/**
 * Generate hash for Notion page properties
 */
export function generatePropertiesHash(properties: any): string {
  return generateContentHash(properties);
}

/**
 * Check if content has changed by comparing hashes
 */
export function hasContentChanged(
  newHash: string,
  oldHash: string | null | undefined
): boolean {
  return !oldHash || newHash !== oldHash;
}

/**
 * Extract text content from Notion blocks for processing
 */
export function extractTextFromNotionBlocks(blocks: any[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map(block => {
      // Extract text from different block types
      switch (block.type) {
        case "paragraph":
        case "heading_1":
        case "heading_2":
        case "heading_3":
        case "bulleted_list_item":
        case "numbered_list_item":
        case "quote":
        case "callout":
          return (
            block[block.type]?.rich_text
              ?.map((text: any) => text.plain_text || "")
              .join("") || ""
          );
        case "code":
          return (
            block.code?.rich_text
              ?.map((text: any) => text.plain_text || "")
              .join("") || ""
          );
        case "toggle":
          return (
            block.toggle?.rich_text
              ?.map((text: any) => text.plain_text || "")
              .join("") || ""
          );
        default:
          return "";
      }
    })
    .filter(text => text.trim().length > 0)
    .join("\n");
}

/**
 * Calculate content quality score for processing priority
 */
export function calculateContentQuality(content: string): number {
  if (!content) return 0;

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const sentenceCount = content
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

  // Quality score based on content metrics
  let score = 0;

  // Word count scoring (50-500 words is optimal)
  if (wordCount >= 50 && wordCount <= 500) score += 40;
  else if (wordCount > 500) score += 30;
  else if (wordCount >= 20) score += 20;
  else score += 10;

  // Sentence structure scoring
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) score += 30;
  else score += 15;

  // Content diversity scoring (rough measure)
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const wordDiversity = uniqueWords / Math.max(wordCount, 1);

  if (wordDiversity > 0.6) score += 30;
  else if (wordDiversity > 0.4) score += 20;
  else score += 10;

  return Math.min(score, 100);
}

/**
 * Determine if content is worth processing based on quality and length
 */
export function shouldProcessContent(
  content: string,
  minWords: number = 20
): boolean {
  if (!content) return false;

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const quality = calculateContentQuality(content);

  return wordCount >= minWords && quality >= 30;
}
