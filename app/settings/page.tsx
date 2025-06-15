import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getNotionAccountsForUser } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotionIntegration } from "@/components/integrations/notion-integration";
import {
  Settings,
  Puzzle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addJob, QUEUE_NAMES } from "@/lib/infrastructure/queue/queue";
import { getNotionAccountIdByClerkId } from "@/lib/actions/notion-actions";

async function NotionIntegrationData() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  try {
    const accounts = await getNotionAccountsForUser(userId);

    return <NotionIntegration accounts={accounts} />;
  } catch (error) {
    console.error("Error loading Notion integration data:", error);
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load integration data</p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

async function StatusMessage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const success = params.success;
  const error = params.error;

  if (success === "notion_connected") {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Notion workspace connected successfully! You can now sync your notes
          and databases.
        </AlertDescription>
      </Alert>
    );
  }

  if (success === "notion_disconnected") {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Notion account disconnected successfully. All synced data has been
          removed.
        </AlertDescription>
      </Alert>
    );
  }

  if (success === "notion_synced") {
    return (
      <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Notion data synced successfully! Your latest pages and databases are
          now available.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    const errorMessages = {
      oauth_denied:
        "You cancelled the Notion authorization. Please try again if you want to connect your workspace.",
      invalid_request:
        "Invalid authorization request. Please try connecting again.",
      unauthorized: "Authentication failed. Please sign in and try again.",
      invalid_token:
        "Failed to authenticate with Notion. Please try connecting again.",
      workspace_error:
        "There was an issue accessing your Notion workspace. Please check your permissions.",
      connection_failed: "Failed to connect to Notion. Please try again later.",
      internal_error: "An internal error occurred. Please try again later.",
      disconnect_failed:
        "Failed to disconnect Notion account. Please try again.",
      sync_failed: "Failed to sync Notion data. Please try again later.",
    };

    const message =
      errorMessages[error as keyof typeof errorMessages] ||
      "An unexpected error occurred. Please try again.";

    return (
      <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const syncNotionData = async () => {
    "use server";
    await addJob(QUEUE_NAMES.SYNC_PIPELINE, {
      userId: userId,
      accountId: (await getNotionAccountIdByClerkId()) || "",
      type: "sync-notion",
    });
    console.log("Synced notion data");
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-4xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account preferences and integrations.
          </p>
          <div>
            <Button onClick={syncNotionData}>
              Sync you notion data <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        <StatusMessage searchParams={searchParams} />

        <Separator />

        {/* Integrations Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Puzzle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Integrations</h2>
            </div>
            <p className="text-muted-foreground">
              Connect external services to enhance your note-taking experience.
            </p>
          </div>

          {/* Available Integrations */}
          <div className="space-y-4">
            <Suspense fallback={<IntegrationSkeleton />}>
              <NotionIntegrationData />
            </Suspense>

            {/* Placeholder for future integrations */}
            <Card className="opacity-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground font-bold text-lg">
                        ?
                      </span>
                    </div>
                    <div>
                      <CardTitle>More Integrations</CardTitle>
                      <CardDescription>
                        Additional integrations coming soon
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    We're working on more integrations. Stay tuned!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-32 w-full bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
