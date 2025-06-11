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
import { NotionIntegration } from "@/components/integrations/notion-integration";
import { getNotionAccounts, getNotionStats } from "@/lib/notion/client";
import { Puzzle } from "lucide-react";

async function NotionIntegrationData() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // In a real implementation, these would fetch from your database
  const accounts = await getNotionAccounts(userId);
  const stats =
    accounts.length > 0 ? await getNotionStats(accounts[0].id) : null;

  return <NotionIntegration accounts={accounts} stats={stats} />;
}

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-4xl">
      <div className="space-y-6">
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
