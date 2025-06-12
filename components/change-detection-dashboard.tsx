"use client";

import { useState, useEffect } from "react";
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
import {
  Search,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  detectPageChanges,
  getPageProcessingQueue,
  batchProcessPages,
} from "@/app/server";

interface ChangeDetectionStats {
  totalPages: number;
  changedPages: number;
  prioritizedPages: Array<{ pageId: string; priority: number; reason: string }>;
}

interface ProcessingQueue {
  pendingPages: any[];
  unprocessedPages: any[];
  processingStats: {
    totalPages: number;
    processedPages: number;
    pendingPages: number;
    unprocessedPages: number;
  } | null;
}

export default function ChangeDetectionDashboard({
  accountId,
}: {
  accountId?: string;
}) {
  const [changeStats, setChangeStats] = useState<ChangeDetectionStats | null>(
    null
  );
  const [processingQueue, setProcessingQueue] =
    useState<ProcessingQueue | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetection, setLastDetection] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Load initial data
  useEffect(() => {
    loadProcessingQueue();
  }, [accountId]);

  const loadProcessingQueue = async () => {
    try {
      const queue = await getPageProcessingQueue(accountId);
      setProcessingQueue(queue);
    } catch (error) {
      console.error("Failed to load processing queue:", error);
    }
  };

  const runChangeDetection = async () => {
    setIsDetecting(true);
    try {
      const results = await detectPageChanges(accountId);
      setChangeStats(results);
      setLastDetection(new Date());

      // Refresh the processing queue after detection
      await loadProcessingQueue();
    } catch (error) {
      console.error("Failed to detect changes:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const runBatchProcessing = async () => {
    if (!accountId) return;

    setIsProcessing(true);
    try {
      const results = await batchProcessPages(accountId, {
        maxPages: 10,
        priorityThreshold: 30,
      });

      console.log("Batch processing results:", results);

      // Refresh data after processing
      await loadProcessingQueue();
      await runChangeDetection();
    } catch (error) {
      console.error("Failed to batch process pages:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getProcessingProgress = () => {
    if (!processingQueue?.processingStats) return 0;
    const { processedPages, totalPages } = processingQueue.processingStats;
    return totalPages > 0 ? (processedPages / totalPages) * 100 : 0;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return "bg-red-500";
    if (priority >= 60) return "bg-orange-500";
    if (priority >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 80) return "Critical";
    if (priority >= 60) return "High";
    if (priority >= 40) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Change Detection & Processing</h2>
          <p className="text-muted-foreground">
            Monitor content changes and manage incremental processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runChangeDetection}
            disabled={isDetecting}
            variant="outline"
          >
            {isDetecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Detect Changes
          </Button>
          <Button
            onClick={runBatchProcessing}
            disabled={isProcessing || !accountId}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Process Pages
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingQueue?.processingStats?.totalPages || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pages in workspace</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingQueue?.processingStats?.processedPages || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {getProcessingProgress().toFixed(1)}% complete
            </p>
            <Progress value={getProcessingProgress()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingQueue?.processingStats?.pendingPages || 0}
            </div>
            <p className="text-xs text-muted-foreground">Changes detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unprocessed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingQueue?.processingStats?.unprocessedPages || 0}
            </div>
            <p className="text-xs text-muted-foreground">Never processed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="changes">Recent Changes</TabsTrigger>
          <TabsTrigger value="queue">Processing Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detection Status</CardTitle>
              <CardDescription>
                Last change detection and processing overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastDetection ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Last detection: {lastDetection.toLocaleString()}
                  </p>
                  {changeStats && (
                    <div className="grid gap-2 text-sm">
                      <div>
                        <strong>Pages scanned:</strong> {changeStats.totalPages}
                      </div>
                      <div>
                        <strong>Changes found:</strong>{" "}
                        {changeStats.changedPages}
                      </div>
                      <div>
                        <strong>High priority:</strong>{" "}
                        {
                          changeStats.prioritizedPages.filter(
                            p => p.priority >= 80
                          ).length
                        }
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No detection run yet. Click "Detect Changes" to start.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Detected Changes</CardTitle>
              <CardDescription>
                Pages with detected changes, sorted by priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changeStats?.prioritizedPages.length ? (
                <div className="space-y-2">
                  {changeStats.prioritizedPages
                    .slice(0, 10)
                    .map((page, index) => (
                      <div
                        key={page.pageId}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getPriorityColor(page.priority)}`}
                          />
                          <span className="text-sm font-mono">
                            {page.pageId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getPriorityLabel(page.priority)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {page.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent changes detected. Run change detection to update.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Processing</CardTitle>
                <CardDescription>
                  Pages with detected changes waiting for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingQueue?.pendingPages.length ? (
                  <div className="space-y-2">
                    {processingQueue.pendingPages.slice(0, 5).map(page => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <span className="font-mono">
                          {page.title?.slice(0, 30) ||
                            `${page.id.slice(0, 8)}...`}
                        </span>
                        <Badge variant="outline">
                          {page.changeDetectedAt
                            ? new Date(
                                page.changeDetectedAt
                              ).toLocaleDateString()
                            : "Pending"}
                        </Badge>
                      </div>
                    ))}
                    {processingQueue.pendingPages.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{processingQueue.pendingPages.length - 5} more pages
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No pages waiting for processing
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Never Processed</CardTitle>
                <CardDescription>
                  Pages that have never been processed for questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingQueue?.unprocessedPages.length ? (
                  <div className="space-y-2">
                    {processingQueue.unprocessedPages.slice(0, 5).map(page => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <span className="font-mono">
                          {page.title?.slice(0, 30) ||
                            `${page.id.slice(0, 8)}...`}
                        </span>
                        <Badge variant="secondary">New</Badge>
                      </div>
                    ))}
                    {processingQueue.unprocessedPages.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{processingQueue.unprocessedPages.length - 5} more
                        pages
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All pages have been processed
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
