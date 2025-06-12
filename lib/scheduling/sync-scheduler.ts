import { addMinutes, addHours, isAfter, differenceInHours } from "date-fns";
import { addJob } from "@/lib/jobs/simple-queue";
import { getNotionPagesByAccountId } from "@/lib/db/queries/notion-pages";
import { getNotionAccountsByUserId } from "@/lib/db/queries/notion-accounts";
import { detectPageChanges, batchProcessPages } from "@/app/server";

export interface SchedulingConfig {
  userId: string;
  timezone: string;
  preferences: {
    realTimeSync: boolean;
    frequentSyncInterval: number; // minutes (15-30)
    regularSyncInterval: number; // hours (24)
    deepSyncInterval: number; // days (7)
    offHoursStart: number; // hour (22 = 10pm)
    offHoursEnd: number; // hour (6 = 6am)
    maxProcessingBatch: number; // max pages per batch
  };
}

export interface PageActivity {
  pageId: string;
  lastModified: Date;
  editFrequency: number; // edits per day
  lastProcessed: Date | null;
  priority: "high" | "medium" | "low";
  nextSyncDue: Date;
}

export class SyncScheduler {
  private static instance: SyncScheduler;
  private activeSchedules = new Map<string, NodeJS.Timeout>();
  private pageActivities = new Map<string, PageActivity>();
  private currentConfig: SchedulingConfig | null = null;

  static getInstance(): SyncScheduler {
    if (!SyncScheduler.instance) {
      SyncScheduler.instance = new SyncScheduler();
    }
    return SyncScheduler.instance;
  }

  /**
   * Initialize scheduling for a user
   */
  async initializeUserScheduling(config: SchedulingConfig): Promise<void> {
    const scheduleKey = `user-${config.userId}`;

    // Store the current configuration
    this.currentConfig = config;

    // Clear existing schedule if any
    this.clearSchedule(scheduleKey);

    // Analyze page activity to determine smart scheduling
    await this.analyzePageActivity(config.userId);

    // Start multi-tier scheduling
    await this.startMultiTierScheduling(config);

    console.log(
      `Initialized scheduling for user ${config.userId} with ${config.preferences.frequentSyncInterval}min intervals`
    );
  }

  /**
   * Analyze page activity to determine optimal sync frequencies
   */
  private async analyzePageActivity(userId: string): Promise<void> {
    try {
      const accounts = await getNotionAccountsByUserId(userId);

      for (const account of accounts) {
        const pages = await getNotionPagesByAccountId(account.id);

        for (const page of pages) {
          const activity = this.calculatePageActivity(page);
          this.pageActivities.set(page.id, activity);
        }
      }
    } catch (error) {
      console.error("Error analyzing page activity:", error);
    }
  }

  /**
   * Calculate page activity and priority
   */
  private calculatePageActivity(page: {
    id: string;
    lastEditedTime: string | Date;
    createdTime: string | Date;
    lastProcessedAt?: string | Date | null;
  }): PageActivity {
    const now = new Date();
    const lastModified = new Date(page.lastEditedTime);
    const lastProcessed = page.lastProcessedAt
      ? new Date(page.lastProcessedAt)
      : null;

    // Calculate edit frequency (rough estimate based on recent activity)
    const daysSinceCreated = Math.max(
      1,
      differenceInHours(now, new Date(page.createdTime)) / 24
    );
    const editFrequency = 1 / daysSinceCreated; // Simple estimation

    // Determine priority based on recency and frequency
    let priority: "high" | "medium" | "low" = "low";
    const hoursSinceModified = differenceInHours(now, lastModified);

    if (hoursSinceModified < 2) priority = "high";
    else if (hoursSinceModified < 24) priority = "medium";

    // Use configuration-based intervals instead of hardcoded ones
    const baseInterval =
      this.currentConfig?.preferences.frequentSyncInterval || 15; // fallback to 15 minutes

    // Calculate next sync due based on priority and user configuration
    let nextSyncDue: Date;
    switch (priority) {
      case "high":
        // High priority: use the exact configured interval
        nextSyncDue = addMinutes(now, baseInterval);
        break;
      case "medium":
        // Medium priority: use 2x the configured interval
        nextSyncDue = addMinutes(now, baseInterval * 2);
        break;
      default:
        // Low priority: use 4x the configured interval or max 2 hours
        const lowPriorityInterval = Math.min(baseInterval * 4, 120);
        nextSyncDue = addMinutes(now, lowPriorityInterval);
    }

    return {
      pageId: page.id,
      lastModified,
      editFrequency,
      lastProcessed,
      priority,
      nextSyncDue,
    };
  }

  /**
   * Start multi-tier scheduling system
   */
  private async startMultiTierScheduling(
    config: SchedulingConfig
  ): Promise<void> {
    const scheduleKey = `user-${config.userId}`;

    // Tier 1: Frequent sync for active documents (every 15-30 minutes)
    const frequentTimer = setInterval(
      async () => {
        await this.runFrequentSync(config);
      },
      config.preferences.frequentSyncInterval * 60 * 1000
    );

    // Tier 2: Regular full sync (daily)
    const regularTimer = setInterval(
      async () => {
        if (this.isOffHours(config)) {
          await this.runRegularSync(config);
        }
      },
      config.preferences.regularSyncInterval * 60 * 60 * 1000
    );

    // Tier 3: Deep reprocessing (weekly)
    const deepTimer = setInterval(
      async () => {
        if (this.isOffHours(config)) {
          await this.runDeepSync(config);
        }
      },
      config.preferences.deepSyncInterval * 24 * 60 * 60 * 1000
    );

    // Store timers for cleanup
    this.activeSchedules.set(`${scheduleKey}-frequent`, frequentTimer);
    this.activeSchedules.set(`${scheduleKey}-regular`, regularTimer);
    this.activeSchedules.set(`${scheduleKey}-deep`, deepTimer);

    // Schedule initial sync
    setTimeout(() => this.runFrequentSync(config), 5000);
  }

  /**
   * Tier 1: Frequent sync for changed documents
   */
  private async runFrequentSync(config: SchedulingConfig): Promise<void> {
    try {
      console.log(`Running frequent sync for user ${config.userId}`);

      const accounts = await getNotionAccountsByUserId(config.userId);

      for (const account of accounts) {
        const changeResult = await detectPageChanges(account.id);

        // Process high-priority changes
        if (changeResult.prioritizedPages.length > 0) {
          await this.processHighPriorityPages(
            account.id,
            changeResult.prioritizedPages,
            config.userId
          );
        }

        // Update page activity tracking
        await this.updatePageActivities(account.id);
      }
    } catch (error) {
      console.error("Error in frequent sync:", error);
    }
  }

  /**
   * Tier 2: Regular comprehensive sync
   */
  private async runRegularSync(config: SchedulingConfig): Promise<void> {
    try {
      console.log(`Running regular sync for user ${config.userId}`);

      const accounts = await getNotionAccountsByUserId(config.userId);

      for (const account of accounts) {
        // First check if there are any changes
        const changeResult = await detectPageChanges(account.id);

        // Early exit: If no changes detected, skip expensive operations
        if (changeResult.changedPages === 0) {
          console.log(
            `✋ No changes detected for account ${account.id} - skipping regular sync operations`
          );
          console.log("💡 This saves processing time and resources!");

          // Still update page activities for scheduling purposes
          await this.updatePageActivities(account.id);
          continue;
        }

        console.log(
          `🚀 Regular sync processing ${changeResult.changedPages} changed pages for account ${account.id}`
        );

        // Full sync of all pages (only if changes detected)
        await this.syncNotionPages(account.id, config.userId);

        // Cleanup stale questions
        await this.cleanupStaleQuestions(config.userId);

        // Update page activities
        await this.updatePageActivities(account.id);
      }
    } catch (error) {
      console.error("Error in regular sync:", error);
    }
  }

  /**
   * Tier 3: Deep reprocessing and cleanup
   */
  private async runDeepSync(config: SchedulingConfig): Promise<void> {
    try {
      console.log(`Running deep sync for user ${config.userId}`);

      const accounts = await getNotionAccountsByUserId(config.userId);

      for (const account of accounts) {
        // Check what needs processing
        const changeResult = await detectPageChanges(account.id);

        // Early exit: If no changes and no pending pages, skip deep processing
        if (changeResult.changedPages === 0 && changeResult.totalPages === 0) {
          console.log(
            `✋ No content found requiring deep processing for account ${account.id} - skipping`
          );
          console.log("💡 This saves AI costs and processing time!");

          // Still update page activities for scheduling purposes
          await this.updatePageActivities(account.id);
          continue;
        }

        console.log(
          `🚀 Deep sync processing account ${account.id} - ${changeResult.changedPages} changed pages, ${changeResult.totalPages} total pages`
        );

        // Batch process with prioritization (changed pages first, then others)
        await batchProcessPages(account.id, {
          maxPages: config.preferences.maxProcessingBatch,
          priorityThreshold: changeResult.changedPages > 0 ? 50 : 10, // Higher threshold if changes exist
          questionTypes: [
            "multiple_choice",
            "short_answer",
            "flashcard",
            "essay",
          ],
          difficulty: "medium",
          count: 5,
        });

        // Update all page activities
        await this.updatePageActivities(account.id);
      }
    } catch (error) {
      console.error("Error in deep sync:", error);
    }
  }

  /**
   * Process high-priority pages immediately
   */
  private async processHighPriorityPages(
    accountId: string,
    pages: Array<{ pageId: string; priority: number; reason: string }>,
    userId: string
  ): Promise<void> {
    console.log(
      `Processing ${pages.length} high-priority pages for account ${accountId}`
    );

    for (const page of pages) {
      try {
        // Add to job queue for immediate processing
        await addJob(
          "generate-questions",
          {
            pageId: page.pageId,
            userId: userId,
            options: {
              questionTypes: ["multiple_choice", "short_answer"],
              difficulty: "medium",
              count: 3,
            },
          },
          {
            triggerType: "scheduled",
            priority: 5,
          }
        );
      } catch (error) {
        console.error(`Failed to queue page ${page.pageId}:`, error);
      }
    }
  }

  /**
   * Update page activity tracking
   */
  private async updatePageActivities(accountId: string): Promise<void> {
    try {
      const pages = await getNotionPagesByAccountId(accountId);

      for (const page of pages) {
        const activity = this.calculatePageActivity(page);
        this.pageActivities.set(page.id, activity);
      }
    } catch (error) {
      console.error("Error updating page activities:", error);
    }
  }

  /**
   * Sync all Notion pages for an account
   */
  private async syncNotionPages(
    accountId: string,
    userId: string
  ): Promise<void> {
    try {
      await addJob(
        "sync-notion-account",
        {
          accountId,
          userId: userId,
          force: false,
        },
        {
          triggerType: "scheduled",
          priority: 7,
        }
      );
    } catch (error) {
      console.error("Error syncing Notion pages:", error);
    }
  }

  /**
   * Cleanup stale questions
   */
  private async cleanupStaleQuestions(userId: string): Promise<void> {
    try {
      await addJob(
        "cleanup-old-questions",
        {
          userId: userId,
          daysOld: 30,
        },
        {
          triggerType: "scheduled",
          priority: 9,
        }
      );
    } catch (error) {
      console.error("Error cleaning up stale questions:", error);
    }
  }

  /**
   * Check if current time is during user's off-hours
   */
  private isOffHours(config: SchedulingConfig): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    return (
      currentHour >= config.preferences.offHoursStart ||
      currentHour <= config.preferences.offHoursEnd
    );
  }

  /**
   * Get optimal sync frequency for a page based on activity
   */
  getPageSyncFrequency(pageId: string): number {
    const activity = this.pageActivities.get(pageId);
    const baseInterval =
      this.currentConfig?.preferences.frequentSyncInterval || 120; // Default 2 hours if no config

    if (!activity) return baseInterval * 4; // Default for unknown pages

    switch (activity.priority) {
      case "high":
        return baseInterval; // Use configured interval
      case "medium":
        return baseInterval * 2; // 2x configured interval
      default:
        return Math.min(baseInterval * 4, 120); // 4x configured interval or max 2 hours
    }
  }

  /**
   * Get pages due for sync
   */
  getPagesDueForSync(): PageActivity[] {
    const now = new Date();
    return Array.from(this.pageActivities.values()).filter(activity =>
      isAfter(now, activity.nextSyncDue)
    );
  }

  /**
   * Clear schedule for a user
   */
  clearSchedule(scheduleKey: string): void {
    const scheduleKeys = Array.from(this.activeSchedules.keys()).filter(key =>
      key.startsWith(scheduleKey)
    );

    scheduleKeys.forEach(key => {
      const timer = this.activeSchedules.get(key);
      if (timer) {
        clearInterval(timer);
        this.activeSchedules.delete(key);
      }
    });
  }

  /**
   * Clear all upcoming syncs and reset page activities
   */
  clearUpcomingSyncs(userId?: string): { clearedCount: number } {
    if (userId) {
      // Clear specific user's page activities if we had user-specific tracking
      // For now, clear all as the system tracks globally
    }

    const clearedCount = this.pageActivities.size;
    this.pageActivities.clear();

    console.log(`Cleared ${clearedCount} upcoming sync schedules`);

    return { clearedCount };
  }

  /**
   * Recalculate all page activities with current configuration
   */
  async recalculatePageActivities(): Promise<{ updatedCount: number }> {
    if (!this.currentConfig) {
      console.log("No configuration available for recalculation");
      return { updatedCount: 0 };
    }

    let updatedCount = 0;
    const activities = Array.from(this.pageActivities.entries());

    // Get fresh page data for recalculation
    try {
      const accounts = await getNotionAccountsByUserId(
        this.currentConfig.userId
      );

      for (const account of accounts) {
        const pages = await getNotionPagesByAccountId(account.id);

        for (const page of pages) {
          const newActivity = this.calculatePageActivity(page);
          this.pageActivities.set(page.id, newActivity);
          updatedCount++;
        }
      }

      console.log(
        `Recalculated ${updatedCount} page activities with ${this.currentConfig.preferences.frequentSyncInterval}min base interval`
      );
    } catch (error) {
      console.error("Error recalculating page activities:", error);
    }

    return { updatedCount };
  }

  /**
   * Clear upcoming syncs for specific pages
   */
  clearSyncsForPages(pageIds: string[]): { clearedCount: number } {
    let clearedCount = 0;

    pageIds.forEach(pageId => {
      if (this.pageActivities.has(pageId)) {
        this.pageActivities.delete(pageId);
        clearedCount++;
      }
    });

    console.log(`Cleared ${clearedCount} sync schedules for specified pages`);

    return { clearedCount };
  }

  /**
   * Reset sync timing for all pages (push them further out)
   */
  resetSyncTiming(delayMinutes: number = 60): { updatedCount: number } {
    const now = new Date();
    let updatedCount = 0;

    this.pageActivities.forEach((activity, pageId) => {
      activity.nextSyncDue = new Date(now.getTime() + delayMinutes * 60 * 1000);
      this.pageActivities.set(pageId, activity);
      updatedCount++;
    });

    console.log(
      `Reset sync timing for ${updatedCount} pages (delayed by ${delayMinutes} minutes)`
    );

    return { updatedCount };
  }

  /**
   * Get scheduling statistics for a user
   */
  getSchedulingStats() {
    const totalPages = this.pageActivities.size;
    const activities = Array.from(this.pageActivities.values());

    const highPriorityPages = activities.filter(
      a => a.priority === "high"
    ).length;
    const mediumPriorityPages = activities.filter(
      a => a.priority === "medium"
    ).length;
    const lowPriorityPages = activities.filter(
      a => a.priority === "low"
    ).length;

    const totalFrequency = activities.reduce(
      (sum, a) => sum + a.editFrequency,
      0
    );
    const avgSyncFrequency = totalPages > 0 ? totalFrequency / totalPages : 0;

    const nextSyncTimes = activities
      .sort((a, b) => a.nextSyncDue.getTime() - b.nextSyncDue.getTime())
      .slice(0, 10)
      .map(a => ({
        pageId: a.pageId,
        nextSync: a.nextSyncDue,
        priority: a.priority,
      }));

    return {
      totalPages,
      highPriorityPages,
      mediumPriorityPages,
      lowPriorityPages,
      avgSyncFrequency,
      nextSyncTimes,
    };
  }
}

/**
 * Default scheduling configuration
 */
export const getDefaultSchedulingConfig = (
  userId: string
): SchedulingConfig => ({
  userId,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  preferences: {
    realTimeSync: true,
    frequentSyncInterval: 5, // 5 minutes for active documents (reduced from 20)
    regularSyncInterval: 24, // Daily full sync
    deepSyncInterval: 7, // Weekly deep processing
    offHoursStart: 22, // 10 PM
    offHoursEnd: 6, // 6 AM
    maxProcessingBatch: 5, // Smaller batch size (reduced from 20)
  },
});

/**
 * Initialize scheduling for a user with default config
 */
export async function initializeUserScheduling(
  userId: string,
  customConfig?: Partial<SchedulingConfig>
): Promise<void> {
  const config = customConfig
    ? { ...getDefaultSchedulingConfig(userId), ...customConfig }
    : getDefaultSchedulingConfig(userId);

  const scheduler = SyncScheduler.getInstance();
  await scheduler.initializeUserScheduling(config);
}

/**
 * Get current scheduling status for a user
 */
export function getUserSchedulingStatus() {
  const scheduler = SyncScheduler.getInstance();
  return scheduler.getSchedulingStats();
}

/**
 * Clear all upcoming syncs
 */
export function clearAllUpcomingSyncs(userId?: string): {
  clearedCount: number;
} {
  const scheduler = SyncScheduler.getInstance();
  return scheduler.clearUpcomingSyncs(userId);
}

/**
 * Clear upcoming syncs for specific pages
 */
export function clearSyncsForPages(pageIds: string[]): {
  clearedCount: number;
} {
  const scheduler = SyncScheduler.getInstance();
  return scheduler.clearSyncsForPages(pageIds);
}

/**
 * Reset sync timing for all pages (delay them)
 */
export function resetAllSyncTiming(delayMinutes: number = 60): {
  updatedCount: number;
} {
  const scheduler = SyncScheduler.getInstance();
  return scheduler.resetSyncTiming(delayMinutes);
}

/**
 * Stop all scheduling for a user
 */
export function stopUserScheduling(userId: string): void {
  const scheduler = SyncScheduler.getInstance();
  scheduler.clearSchedule(`user-${userId}`);
  scheduler.clearUpcomingSyncs(userId);
}

/**
 * Recalculate page activities with current configuration
 */
export async function recalculatePageActivities(): Promise<{
  updatedCount: number;
}> {
  const scheduler = SyncScheduler.getInstance();
  return scheduler.recalculatePageActivities();
}

/**
 * Update configuration and recalculate page activities
 */
export async function updateSchedulingConfiguration(
  userId: string,
  newConfig: Partial<SchedulingConfig>
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    // Reinitialize with new configuration
    await initializeUserScheduling(userId, newConfig);

    // Recalculate all page activities with new intervals
    const result = await recalculatePageActivities();

    return {
      success: true,
      updatedCount: result.updatedCount,
      message: `Configuration updated and ${result.updatedCount} page schedules recalculated`,
    };
  } catch (error) {
    console.error("Error updating scheduling configuration:", error);
    return {
      success: false,
      updatedCount: 0,
      message: "Failed to update scheduling configuration",
    };
  }
}
