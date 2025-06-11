import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ExternalLink,
  Database,
  Calendar,
  User,
  TestTube,
} from "lucide-react";
import { getUserNotionAccounts } from "@/app/server";
import { getNotionPagesByAccountId } from "@/lib/db/queries/notion-pages";
import { getNotionDatabasesByAccountId } from "@/lib/db/queries/notion-databases";
import Link from "next/link";

async function NotionTestData() {
  try {
    const accounts = await getUserNotionAccounts();

    if (accounts.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>
                No Notion accounts connected. Please connect an account first.
              </p>
              <Link href="/settings">
                <Button className="mt-4">Go to Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    }

    const allPages = [];
    const allDatabases = [];

    for (const account of accounts) {
      const pages = await getNotionPagesByAccountId(account.id);
      const databases = await getNotionDatabasesByAccountId(account.id);

      allPages.push(
        ...pages.map(page => ({ ...page, accountName: account.workspaceName }))
      );
      allDatabases.push(
        ...databases.map(db => ({ ...db, accountName: account.workspaceName }))
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-xl font-medium">{accounts.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Connected Accounts
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-xl font-medium">
                    {allDatabases.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Databases
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-xl font-medium">{allPages.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Total Pages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Databases Section */}
        {allDatabases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Synced Databases ({allDatabases.length})</span>
              </CardTitle>
              <CardDescription>
                All databases synced from your connected Notion workspaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allDatabases.map(database => (
                  <div
                    key={database.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
                        <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium">{database.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {database.accountName} • Last edited:{" "}
                          {database.lastEditedTime.toLocaleDateString()}
                        </div>
                        {database.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {database.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {database.pageCount || 0} pages
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={database.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pages Section */}
        {allPages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Synced Pages ({allPages.length})</span>
              </CardTitle>
              <CardDescription>
                All pages synced from your connected Notion workspaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allPages.map(page => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                        {page.icon?.emoji ? (
                          <span className="text-sm">{page.icon.emoji}</span>
                        ) : (
                          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{page.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.accountName} • Last edited:{" "}
                          {page.lastEditedTime.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Parent: {page.parent?.type || "workspace"}
                          {page.content && (
                            <span className="ml-2">• Has content</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          page.archived === "true" ? "destructive" : "default"
                        }
                      >
                        {page.archived === "true" ? "Archived" : "Active"}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {allPages.length === 0 && allDatabases.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No pages or databases synced yet.</p>
                <p className="text-sm mt-1">
                  Try syncing your Notion accounts in Settings.
                </p>
                <Link href="/settings">
                  <Button className="mt-4">Go to Settings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error loading test data:", error);
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load test data</p>
            <p className="text-sm mt-1">Check the console for errors.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

export default async function NotionTestPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-6xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TestTube className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Notion Data Test Page
            </h1>
            <Badge
              variant="outline"
              className="text-orange-600 border-orange-200"
            >
              TEST ONLY
            </Badge>
          </div>
          <p className="text-muted-foreground">
            This page displays all synced Notion pages and databases for testing
            purposes.
          </p>
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex items-center space-x-4">
          <Link href="/settings">
            <Button variant="outline">← Back to Settings</Button>
          </Link>
        </div>

        {/* Test Data */}
        <Suspense
          fallback={
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">Loading test data...</div>
              </CardContent>
            </Card>
          }
        >
          <NotionTestData />
        </Suspense>
      </div>
    </div>
  );
}
