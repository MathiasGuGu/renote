"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Trash2,
} from "lucide-react";
import { cancelJob } from "@/app/server";
import { useJobQueueStore } from "@/lib/stores/job-queue-store";

export function BackgroundJobQueue() {
  const { jobs, isLoading, error, isPolling, refreshJobs, togglePolling } =
    useJobQueueStore();

  // Component mount effect for initialization
  useEffect(() => {
    // Load initial data but don't auto-start polling
    refreshJobs();

    // Cleanup on unmount
    return () => {
      // Don't stop polling on unmount as other components might need it
    };
  }, [refreshJobs]);

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      await refreshJobs(); // Refresh the list
    } catch (err) {
      console.error("Error cancelling job:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "created":
      case "retry":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "active":
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "created":
      case "retry":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatJobType = (jobType: string) => {
    return jobType
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDuration = (duration?: number | null) => {
    if (!duration) return "—";
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>Loading job history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>Error loading job history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-4">{error}</div>
          <Button onClick={refreshJobs} className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Background Jobs ({jobs.length})</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePolling}
              className="flex items-center space-x-1"
            >
              {isPolling ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span>{isPolling ? "Pause" : "Start"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshJobs}
              disabled={isLoading}
            >
              <Loader2
                className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Real-time background job monitoring with manual refresh controls
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No background jobs found</p>
            <p className="text-sm">Jobs will appear here when created</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(job.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {formatJobType(job.jobType)}
                      </span>
                      <Badge
                        className={`text-xs ${getStatusColor(job.status)}`}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {job.jobId.substring(0, 8)}...
                      {job.entityId && (
                        <span className="ml-2">
                          • Entity: {job.entityId.substring(0, 8)}...
                        </span>
                      )}
                      {job.duration && (
                        <span className="ml-2">
                          • Duration: {formatDuration(job.duration)}
                        </span>
                      )}
                    </div>
                    {job.error && (
                      <div className="text-sm text-red-600 mt-1 truncate">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-muted-foreground text-right">
                    <div>
                      {job.createdAt.toLocaleDateString()}{" "}
                      {job.createdAt.toLocaleTimeString()}
                    </div>
                    {job.completedAt && (
                      <div>
                        Completed: {job.completedAt.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  {(job.status === "created" || job.status === "active") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelJob(job.jobId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
