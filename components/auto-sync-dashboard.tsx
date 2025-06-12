"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Activity,
  Clock,
  CheckCircle,
  Zap,
  BarChart3,
  Shield,
  RefreshCw,
  Timer,
  AlertCircle,
  Settings,
  FileText,
  Brain,
  Database,
  ArrowRight,
} from "lucide-react";
import {
  initializeUserAutoSync,
  getAutoSyncStatus,
  getSyncAnalytics,
  triggerRealTimeSync,
  clearProcessingQueue,
  clearUpcomingSyncs,
  clearAllScheduledItems,
  createTestJobActivity,
  cleanupTestJobActivity,
  createSyncProcessActivity,
  debugChangeDetection,
} from "@/app/server";

interface SyncStatus {
  isActive: boolean;
  stats: {
    totalPages: number;
    highPriorityPages: number;
    mediumPriorityPages: number;
    lowPriorityPages: number;
    avgSyncFrequency: number;
  };
  nextSyncTimes: Array<{ pageId: string; nextSync: Date; priority: string }>;
}

interface SyncAnalytics {
  syncFrequency: {
    frequent: number;
    daily: number;
    weekly: number;
  };
  processingStats: {
    totalPages: number;
    processedPages: number;
    pendingPages: number;
    avgProcessingTime: number;
  };
  qualityMetrics: {
    avgQualityScore: number;
    duplicatesPreventedCount: number;
    uniquenessRate: number;
  };
  upcomingSyncs: Array<{
    pageId: string;
    title: string;
    nextSync: Date;
    priority: string;
  }>;
}

// Activity types for the feed
interface ActivityItem {
  id: string;
  type:
    | "sync_started"
    | "task_created"
    | "questions_generated"
    | "sync_completed"
    | "page_analyzed"
    | "batch_processed";
  title: string;
  description: string;
  timestamp: Date;
  pageId?: string;
  status: "running" | "completed" | "failed";
  icon: any;
  color: string;
}

// Update the countdown timer to trigger real sync processes
function CountdownTimer({
  targetDate,
  onExpire,
  pageId,
  accountId,
}: {
  targetDate: Date;
  onExpire?: () => void;
  pageId?: string;
  accountId?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });
  const [hasTriggeredSync, setHasTriggeredSync] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, isOverdue: false });
        setHasTriggeredSync(false); // Reset trigger flag when timer is active
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isOverdue: true,
        });

        // Trigger real sync processes when timer expires
        if (!hasTriggeredSync) {
          setHasTriggeredSync(true);
          console.log("⏰ TIMER EXPIRED! Starting real sync processes...");
          triggerRealSyncProcesses();
          onExpire?.();
        }
      }
    };

    // Trigger real sync processes when timer expires
    const triggerRealSyncProcesses = async () => {
      try {
        console.log("🔥 Timer expired! Starting intelligent sync pipeline...");

        // Import server actions
        const {
          triggerRealTimeSync,
          enqueueQuestionGeneration,
          enqueueSyncJob,
          detectPageChanges,
          batchProcessPages,
          createSyncProcessActivity,
        } = await import("@/app/server");

        if (!accountId) {
          console.log("❌ No accountId provided, cannot sync");
          return;
        }

        // Step 1: Perform sync to get latest content
        console.log("1️⃣ Syncing account to fetch latest content...");
        const syncResult = await triggerRealTimeSync(accountId);
        console.log(
          `📥 Sync completed: ${syncResult.changesSynced} changes, ${syncResult.processingTime}ms`
        );

        // Step 2: Detect actual content changes
        console.log("2️⃣ Analyzing content changes...");
        const changeDetection = await detectPageChanges(accountId);
        console.log(
          `🔍 Change detection: ${changeDetection.changedPages}/${changeDetection.totalPages} pages changed`
        );

        // Step 3: Create job history entry for the sync analysis
        try {
          const activityResult = await createSyncProcessActivity({
            accountId,
            syncResult,
            changeDetection,
          });

          if (activityResult.success) {
            console.log("✅ Created job history entry for sync pipeline");
          } else {
            console.error(
              "⚠️ Failed to create job history entry:",
              activityResult.message
            );
          }
        } catch (error) {
          console.error("⚠️ Failed to create job history entry:", error);
        }

        // Step 4: Only proceed with question generation if changes detected
        if (changeDetection.changedPages === 0) {
          console.log(
            "✋ No content changes detected - stopping pipeline early (no questions needed)"
          );
          console.log(
            "💡 Pipeline optimization: This saves AI costs and processing time!"
          );
          console.log(
            "🎯 The system intelligently skips unnecessary AI operations when content hasn't changed"
          );

          // Notify components that process completed (even with early stop)
          window.dispatchEvent(
            new CustomEvent("syncProcessesTriggered", {
              detail: { accountId, pageId, earlyStop: true },
            })
          );
          return;
        }

        console.log(
          `🚀 Changes detected! Proceeding with question generation for ${changeDetection.changedPages} pages...`
        );

        // Step 5: Queue comprehensive sync job for changed content
        console.log("3️⃣ Queueing comprehensive sync job...");
        await enqueueSyncJob(accountId, 0, "scheduled");

        // Step 6: Generate questions based on what changed
        if (
          pageId &&
          changeDetection.prioritizedPages.some(p => p.pageId === pageId)
        ) {
          // Specific page has changes - generate questions for it
          console.log(`4️⃣ Generating questions for changed page: ${pageId}`);
          await enqueueQuestionGeneration(
            pageId,
            {
              questionTypes: ["multiple_choice", "short_answer"],
              difficulty: "medium",
              count: 3,
            },
            0,
            "scheduled"
          );
        } else {
          // Process batch of changed pages only
          console.log(
            `4️⃣ Batch processing ${changeDetection.changedPages} changed pages...`
          );
          await batchProcessPages(accountId, {
            maxPages: Math.min(changeDetection.changedPages, 5),
            priorityThreshold: 0.6, // Lower threshold since we know these have changes
          });
        }

        console.log("✅ Smart sync pipeline completed successfully!");

        // Notify components that real processes have started
        window.dispatchEvent(
          new CustomEvent("syncProcessesTriggered", {
            detail: { accountId, pageId },
          })
        );
      } catch (error) {
        console.error("❌ Error triggering real sync processes:", error);

        // Even on error, notify that a process occurred
        window.dispatchEvent(
          new CustomEvent("syncProcessesTriggered", {
            detail: { accountId, pageId, error: true },
          })
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire, hasTriggeredSync, pageId, accountId]);

  return (
    <Badge
      variant={timeLeft.isOverdue ? "destructive" : "outline"}
      className={`text-xs font-mono ${timeLeft.isOverdue ? "bg-red-100 text-red-700 animate-pulse" : ""}`}
    >
      {timeLeft.isOverdue
        ? "Overdue"
        : timeLeft.days > 0
          ? `${timeLeft.days}d ${timeLeft.hours}h`
          : timeLeft.hours > 0
            ? `${timeLeft.hours}h ${timeLeft.minutes}m`
            : timeLeft.minutes > 0
              ? `${timeLeft.minutes}m ${timeLeft.seconds}s`
              : `${timeLeft.seconds}s`}
    </Badge>
  );
}

// Replace the ActivityFeed component with real data connection
function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch real activities from server
  const fetchActivities = useCallback(async () => {
    console.log("🔄 ActivityFeed: Fetching activities...");
    try {
      const { getRealtimeJobActivity } = await import("@/app/server");
      const result = await getRealtimeJobActivity(15);

      console.log("📊 ActivityFeed: Server response:", {
        success: result.success,
        activityCount: result.activities.length,
        debug: result.debug,
      });

      if (result.success) {
        const realActivities: ActivityItem[] = result.activities.map(
          activity => {
            // Map activity types to visual properties
            const getActivityVisuals = (type: string) => {
              switch (type) {
                case "sync_started":
                case "sync_running":
                  return { icon: RefreshCw, color: "text-blue-600" };
                case "sync_completed":
                  return { icon: CheckCircle, color: "text-green-700" };
                case "questions_generating":
                case "questions_generated":
                  return { icon: Brain, color: "text-green-600" };
                case "task_created":
                  return { icon: Settings, color: "text-orange-600" };
                case "page_analyzed":
                  return { icon: FileText, color: "text-purple-600" };
                case "batch_processed":
                  return { icon: Database, color: "text-indigo-600" };
                case "cleanup_completed":
                  return { icon: CheckCircle, color: "text-green-600" };
                default:
                  return { icon: Activity, color: "text-gray-600" };
              }
            };

            const visuals = getActivityVisuals(activity.type);

            return {
              id: activity.id,
              type: activity.type as ActivityItem["type"],
              title: activity.title,
              description: activity.description,
              timestamp: activity.timestamp,
              pageId: activity.pageId,
              status:
                activity.status === "active"
                  ? "running"
                  : activity.status === "failed"
                    ? "failed"
                    : "completed",
              icon: visuals.icon,
              color: visuals.color,
            };
          }
        );

        console.log(
          "✨ ActivityFeed: Mapped activities:",
          realActivities.length,
          "activities"
        );
        setActivities(realActivities);
      } else {
        console.log("❌ ActivityFeed: Server returned unsuccessful result");
        setActivities([]);
      }
    } catch (error) {
      console.error("💥 ActivityFeed: Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Listen for sync process triggers and auto-start polling
  useEffect(() => {
    const handleSyncTriggered = () => {
      console.log("🔄 Sync processes triggered - starting activity monitoring");
      setIsPolling(true);
      // Immediately fetch activities to catch new jobs
      fetchActivities();
    };

    window.addEventListener("syncProcessesTriggered", handleSyncTriggered);

    return () => {
      window.removeEventListener("syncProcessesTriggered", handleSyncTriggered);
    };
  }, [fetchActivities]);

  // Real-time polling
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(fetchActivities, 3000); // Poll every 3 seconds when active

    return () => clearInterval(interval);
  }, [isPolling, fetchActivities]);

  const togglePolling = () => {
    setIsPolling(!isPolling);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time sync processes, task creation, and question generation.
              Automatically starts when timers expire.
            </CardDescription>
          </div>
          <Button
            onClick={togglePolling}
            size="sm"
            variant={isPolling ? "destructive" : "default"}
          >
            {isPolling ? "Stop" : "Start"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Loading activity feed...</p>
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity yet. Waiting for sync processes...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => {
                const IconComponent = activity.icon;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className={`flex-shrink-0 ${activity.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">
                          {activity.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(activity.status)}`}
                        >
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.timestamp.toLocaleTimeString()}</span>
                        {activity.pageId && (
                          <>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-mono">{activity.pageId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Process status indicators - connected to real backend
function ProcessStatusIndicators() {
  const [processes, setProcesses] = useState<
    Array<{
      name: string;
      status: "idle" | "running" | "completed";
      progress: number;
      activeJobs: number;
      lastActivity?: Date;
    }>
  >([
    {
      name: "Sync Timer",
      status: "idle",
      progress: 0,
      activeJobs: 0,
    },
    {
      name: "Queue Processing",
      status: "idle",
      progress: 0,
      activeJobs: 0,
    },
    {
      name: "Question Generation",
      status: "idle",
      progress: 0,
      activeJobs: 0,
    },
    {
      name: "Content Analysis",
      status: "idle",
      progress: 0,
      activeJobs: 0,
    },
  ]);
  const [isPolling, setIsPolling] = useState(true);

  // Fetch real process status from server
  const fetchProcessStatus = useCallback(async () => {
    try {
      const { getProcessStatus } = await import("@/app/server");
      const result = await getProcessStatus();

      if (result.success) {
        setProcesses(
          result.processes.map(proc => ({
            name: proc.name,
            status: proc.status,
            progress: proc.progress || 0,
            activeJobs: proc.activeJobs,
            lastActivity: proc.lastActivity,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching process status:", error);
    }
  }, []);

  // Listen for sync process triggers and immediately check status
  useEffect(() => {
    const handleSyncTriggered = () => {
      console.log("🔄 Sync processes triggered - checking process status");
      setIsPolling(true);
      // Immediately fetch status to catch new processes
      fetchProcessStatus();
    };

    window.addEventListener("syncProcessesTriggered", handleSyncTriggered);

    return () => {
      window.removeEventListener("syncProcessesTriggered", handleSyncTriggered);
    };
  }, [fetchProcessStatus]);

  // Initial load and polling
  useEffect(() => {
    fetchProcessStatus();

    if (!isPolling) return;

    const interval = setInterval(fetchProcessStatus, 2000); // Poll every 2 seconds for process status

    return () => clearInterval(interval);
  }, [isPolling, fetchProcessStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "idle":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "idle":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Process Status
        </CardTitle>
        <CardDescription>
          Real-time status of sync processes and task execution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processes.map((process, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(process.status)}>
                    {getStatusIcon(process.status)}
                  </span>
                  <span className="text-sm font-medium">{process.name}</span>
                  {process.activeJobs > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {process.activeJobs} active
                    </Badge>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    process.status === "running"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : process.status === "completed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  {process.status}
                </Badge>
              </div>
              {process.status === "running" && process.progress > 0 && (
                <Progress value={process.progress} className="h-2" />
              )}
              {process.lastActivity && (
                <p className="text-xs text-muted-foreground">
                  Last activity: {process.lastActivity.toLocaleTimeString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutoSyncDashboard({
  accountId,
}: {
  accountId?: string;
}) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [analytics, setAnalytics] = useState<SyncAnalytics | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isClearingSyncs, setIsClearingSyncs] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);
  const [isCleaningTestData, setIsCleaningTestData] = useState(false);
  const [isDebuggingChanges, setIsDebuggingChanges] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [activityTrigger, setActivityTrigger] = useState(0);

  // Configuration state
  const [config, setConfig] = useState({
    autoSyncEnabled: false,
    frequentSyncInterval: 5, // minutes (reduced from 20)
    maxProcessingBatch: 5, // reduced from 20
    offHoursStart: 22,
    offHoursEnd: 6,
  });

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await getAutoSyncStatus();
      setSyncStatus(status);
      setConfig(prev => ({ ...prev, autoSyncEnabled: status.isActive }));
    } catch (error) {
      console.error("Failed to load sync status:", error);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      if (accountId) {
        const analyticsData = await getSyncAnalytics(accountId);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  }, [accountId]);

  // Load initial data
  useEffect(() => {
    loadSyncStatus();
    loadAnalytics();
  }, [loadSyncStatus, loadAnalytics]);

  const handleToggleAutoSync = async () => {
    setIsConfiguring(true);
    try {
      if (config.autoSyncEnabled) {
        // Disable auto sync (would need a disable function)
        setConfig(prev => ({ ...prev, autoSyncEnabled: false }));
      } else {
        // Initialize auto sync
        await initializeUserAutoSync(undefined, {
          frequentSyncInterval: config.frequentSyncInterval,
          maxProcessingBatch: config.maxProcessingBatch,
          offHoursStart: config.offHoursStart,
          offHoursEnd: config.offHoursEnd,
        });
        setConfig(prev => ({ ...prev, autoSyncEnabled: true }));
      }

      await loadSyncStatus();
    } catch (error) {
      console.error("Failed to toggle auto sync:", error);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleRealTimeSync = async () => {
    if (!accountId) return;

    setIsSyncing(true);
    try {
      const result = await triggerRealTimeSync(accountId);
      console.log("Real-time sync result:", result);

      // Refresh data after sync
      await loadSyncStatus();
      await loadAnalytics();
    } catch (error) {
      console.error("Failed to trigger real-time sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = async () => {
    setIsClearingQueue(true);
    try {
      const result = await clearProcessingQueue();
      console.log("Clear queue result:", result);

      // Refresh data after clearing
      await loadSyncStatus();
      await loadAnalytics();

      // You could add a toast notification here
      alert(`${result.message}`);
    } catch (error) {
      console.error("Failed to clear processing queue:", error);
      alert("Failed to clear processing queue");
    } finally {
      setIsClearingQueue(false);
    }
  };

  const handleClearSyncs = async () => {
    setIsClearingSyncs(true);
    try {
      const result = await clearUpcomingSyncs();
      console.log("Clear syncs result:", result);

      // Refresh data after clearing
      await loadSyncStatus();
      await loadAnalytics();

      alert(`${result.message}`);
    } catch (error) {
      console.error("Failed to clear upcoming syncs:", error);
      alert("Failed to clear upcoming syncs");
    } finally {
      setIsClearingSyncs(false);
    }
  };

  const handleClearAll = async () => {
    const confirmed = confirm(
      "This will clear both the job queue AND all upcoming syncs. Are you sure?"
    );
    if (!confirmed) return;

    setIsClearingQueue(true);
    setIsClearingSyncs(true);
    try {
      const result = await clearAllScheduledItems();
      console.log("Clear all result:", result);

      // Refresh data after clearing
      await loadSyncStatus();
      await loadAnalytics();

      alert(`${result.message}`);
    } catch (error) {
      console.error("Failed to clear all scheduled items:", error);
      alert("Failed to clear all scheduled items");
    } finally {
      setIsClearingQueue(false);
      setIsClearingSyncs(false);
    }
  };

  const handleCreateTestData = async () => {
    setIsCreatingTestData(true);
    try {
      const result = await createTestJobActivity();
      alert(`Created ${result.jobsCreated} test activity entries`);

      // Trigger activity refresh
      window.dispatchEvent(new CustomEvent("syncProcessesTriggered"));
    } catch (error) {
      console.error("Failed to create test data:", error);
      alert("Failed to create test data");
    } finally {
      setIsCreatingTestData(false);
    }
  };

  const handleCleanupTestData = async () => {
    setIsCleaningTestData(true);
    try {
      const result = await cleanupTestJobActivity();
      alert(`Deleted ${result.jobsDeleted} test activity entries`);

      // Trigger activity refresh to clear the display
      window.dispatchEvent(new CustomEvent("syncProcessesTriggered"));
    } catch (error) {
      console.error("Failed to cleanup test data:", error);
      alert("Failed to cleanup test data");
    } finally {
      setIsCleaningTestData(false);
    }
  };

  const handleDebugChanges = async () => {
    if (!accountId) {
      alert("No account ID available for debugging");
      return;
    }

    setIsDebuggingChanges(true);
    try {
      console.log("🔍 Starting change detection debug...");
      const result = await debugChangeDetection(accountId);

      if (result.success) {
        console.log("📊 Debug results:", result.diagnostics);

        const analysis = result.diagnostics.samplePageAnalysis;
        if (analysis) {
          const message = `
Debug Results:
- Total pages: ${result.diagnostics.totalPages}
- Sync status: ${result.diagnostics.syncStatus}
- Sample page: ${analysis.title}
- Has changes: ${analysis.hasChanges}
- Change details: ${JSON.stringify(analysis.changeDetails, null, 2)}

Check console for detailed logs.
          `;
          alert(message);
        } else {
          alert(`Debug completed: ${result.diagnostics.syncStatus}`);
        }
      } else {
        alert("Debug failed - check console for details");
      }
    } catch (error) {
      console.error("Failed to debug change detection:", error);
      alert("Failed to debug change detection");
    } finally {
      setIsDebuggingChanges(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      // Reinitialize auto-sync with new settings
      await initializeUserAutoSync(undefined, {
        frequentSyncInterval: config.frequentSyncInterval,
        maxProcessingBatch: config.maxProcessingBatch,
        offHoursStart: config.offHoursStart,
        offHoursEnd: config.offHoursEnd,
      });

      // Refresh data to show new settings in effect
      await loadSyncStatus();
      await loadAnalytics();

      alert(
        `Settings saved! All sync schedules updated to use ${config.frequentSyncInterval}-minute intervals.`
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const formatNextSync = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 0) return "Overdue";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440)
      return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-orange-500";
      default:
        return "bg-green-500";
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "text-green-600" : "text-gray-500";
  };

  // Function to trigger activity simulation
  const triggerActivity = useCallback((type: string, pageId?: string) => {
    console.log(
      `🔥 Timer expired! Triggering ${type} activity for ${pageId || "system"}`
    );
    setActivityTrigger(prev => prev + 1); // This will trigger activity in ActivityFeed
  }, []);

  // Modified ActivityFeed to accept trigger
  const ActivityFeedWithTrigger = useCallback(() => {
    return <ActivityFeed />;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auto-Sync Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and control automated document syncing and question
            generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateTestData}
            disabled={isCreatingTestData}
            variant="outline"
            className="text-green-600 hover:text-green-700"
          >
            {isCreatingTestData ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Test Activity
          </Button>
          <Button
            onClick={handleCleanupTestData}
            disabled={isCleaningTestData}
            variant="outline"
            className="text-purple-600 hover:text-purple-700"
          >
            {isCleaningTestData ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Clean Test Data
          </Button>
          <Button
            onClick={handleDebugChanges}
            disabled={isDebuggingChanges || !accountId}
            variant="outline"
            className="text-blue-600 hover:text-blue-700"
          >
            {isDebuggingChanges ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Debug Changes
          </Button>
          <Button
            onClick={handleClearSyncs}
            disabled={isClearingSyncs || !accountId}
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            {isClearingSyncs ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Timer className="h-4 w-4" />
            )}
            Clear Syncs
          </Button>
          <Button
            onClick={handleClearQueue}
            disabled={isClearingQueue || !accountId}
            variant="outline"
            className="text-orange-600 hover:text-orange-700"
          >
            {isClearingQueue ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Clear Queue
          </Button>
          <Button
            onClick={handleClearAll}
            disabled={isClearingQueue || isClearingSyncs || !accountId}
            variant="destructive"
            className="text-white"
          >
            {isClearingQueue || isClearingSyncs ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Clear All
          </Button>
          <Button
            onClick={handleRealTimeSync}
            disabled={isSyncing || !accountId}
            variant="outline"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Auto-Sync Status
            </CardTitle>
            <Activity
              className={`h-4 w-4 ${getStatusColor(config.autoSyncEnabled)}`}
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.autoSyncEnabled}
                onCheckedChange={handleToggleAutoSync}
                disabled={isConfiguring}
              />
              <Label className="text-sm">
                {config.autoSyncEnabled ? "Active" : "Inactive"}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {syncStatus
                ? `${syncStatus.stats.totalPages} pages monitored`
                : "Loading..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Processing Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics
                ? `${analytics.processingStats.avgProcessingTime}s`
                : "0s"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
            <Progress
              value={
                analytics
                  ? (analytics.processingStats.processedPages /
                      analytics.processingStats.totalPages) *
                    100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics
                ? `${analytics.qualityMetrics.avgQualityScore.toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics
                ? `${analytics.qualityMetrics.duplicatesPreventedCount} duplicates prevented`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sync Frequency
            </CardTitle>
            <Timer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? `${analytics.syncFrequency.frequent}` : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Syncs in last hour</p>
            <p className="text-xs text-muted-foreground">
              {analytics ? `${analytics.syncFrequency.daily} today` : "0 today"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest sync operations and processing results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Pages synced</span>
                    </div>
                    <Badge variant="outline">
                      {analytics ? analytics.processingStats.processedPages : 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <Badge variant="outline">
                      {analytics ? analytics.processingStats.pendingPages : 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Duplicates prevented</span>
                    </div>
                    <Badge variant="outline">
                      {analytics
                        ? analytics.qualityMetrics.duplicatesPreventedCount
                        : 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Scheduled Operations</CardTitle>
                <CardDescription>
                  Upcoming automated sync tasks with live countdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncStatus?.nextSyncTimes.length ? (
                  <div className="space-y-2">
                    {syncStatus.nextSyncTimes.slice(0, 3).map((sync, index) => (
                      <div
                        key={`${sync.pageId}-${index}`}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getPriorityColor(sync.priority)}`}
                          />
                          <span className="text-sm font-mono">
                            {sync.pageId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CountdownTimer
                            targetDate={new Date(sync.nextSync)}
                            onExpire={() =>
                              triggerActivity("sync", sync.pageId)
                            }
                            pageId={sync.pageId}
                            accountId={accountId}
                          />
                          <span className="text-xs text-muted-foreground">
                            {sync.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No scheduled operations. Auto-sync may be disabled.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ActivityFeedWithTrigger />
            <ProcessStatusIndicators />
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Syncs</CardTitle>
              <CardDescription>
                Next scheduled sync operations by priority with live countdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncStatus?.nextSyncTimes.length ? (
                <div className="space-y-2">
                  {syncStatus.nextSyncTimes.slice(0, 10).map((sync, index) => (
                    <div
                      key={`${sync.pageId}-${index}`}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${getPriorityColor(sync.priority)}`}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-mono">
                            {sync.pageId.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Priority: {sync.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CountdownTimer
                          targetDate={new Date(sync.nextSync)}
                          onExpire={() => triggerActivity("sync", sync.pageId)}
                          pageId={sync.pageId}
                          accountId={accountId}
                        />
                        <div className="text-xs text-muted-foreground">
                          {new Date(sync.nextSync).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No scheduled syncs found. Auto-sync may be disabled.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sync Performance</CardTitle>
                <CardDescription>
                  Frequency and timing analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last hour</span>
                      <span className="text-sm font-medium">
                        {analytics.syncFrequency.frequent} syncs
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last day</span>
                      <span className="text-sm font-medium">
                        {analytics.syncFrequency.daily} syncs
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last week</span>
                      <span className="text-sm font-medium">
                        {analytics.syncFrequency.weekly} syncs
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm">Avg processing time</span>
                      <span className="text-sm font-medium">
                        {analytics.processingStats.avgProcessingTime}s
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>
                  Duplicate prevention and content quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quality score</span>
                      <span className="text-sm font-medium">
                        {analytics.qualityMetrics.avgQualityScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Uniqueness rate</span>
                      <span className="text-sm font-medium">
                        {analytics.qualityMetrics.uniquenessRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Duplicates prevented</span>
                      <span className="text-sm font-medium">
                        {analytics.qualityMetrics.duplicatesPreventedCount}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>
                Customize auto-sync behavior and scheduling. Changes take effect
                when you click "Save Settings".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Dynamic Intervals:</strong> The sync interval you set
                  becomes the base timing for all pages. High priority pages
                  sync at your exact interval, medium priority at 2x, and low
                  priority at 4x the interval.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    value={config.frequentSyncInterval}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        frequentSyncInterval: Number(e.target.value),
                      }))
                    }
                    min="2"
                    max="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    How often to check for changes (2-60 minutes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={config.maxProcessingBatch}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        maxProcessingBatch: Number(e.target.value),
                      }))
                    }
                    min="1"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max pages to process in one batch (1-10 for faster
                    processing)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offHoursStart">Off-hours Start</Label>
                  <Input
                    id="offHoursStart"
                    type="number"
                    value={config.offHoursStart}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        offHoursStart: Number(e.target.value),
                      }))
                    }
                    min="0"
                    max="23"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hour when heavy processing can start (0-23)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offHoursEnd">Off-hours End</Label>
                  <Input
                    id="offHoursEnd"
                    type="number"
                    value={config.offHoursEnd}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        offHoursEnd: Number(e.target.value),
                      }))
                    }
                    min="0"
                    max="23"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hour when heavy processing should end (0-23)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    variant="outline"
                    className="flex-1"
                  >
                    {isSavingSettings ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                  <Button
                    onClick={handleToggleAutoSync}
                    disabled={isConfiguring}
                    className="flex-1"
                  >
                    {isConfiguring ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : config.autoSyncEnabled ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {config.autoSyncEnabled
                      ? "Disable Auto-Sync"
                      : "Enable Auto-Sync"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
