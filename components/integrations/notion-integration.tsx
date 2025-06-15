"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  NotionAccount,
  NotionIntegrationStats,
} from "@/lib/integrations/notion/types";
import { Database } from "lucide-react";
import Image from "next/image";

interface NotionIntegrationProps {
  accounts: NotionAccount[];
}

export function NotionIntegration({ accounts }: NotionIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(accounts.length > 0);
  //   const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  //   const [isSyncing, setIsSyncing] = useState<string | null>(null);

  //   const getStatusIcon = (status: NotionAccount["status"]) => {
  //     switch (status) {
  //       case "connected":
  //         return <CheckCircle className="h-4 w-4 text-green-500" />;
  //       case "error":
  //         return <XCircle className="h-4 w-4 text-red-500" />;
  //       case "disconnected":
  //         return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  //     }
  //   };

  const getStatusBadge = (status: NotionAccount["status"]) => {
    const variants = {
      connected: "default",
      error: "destructive",
      disconnected: "secondary",
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleConnectNotion = () => {
    // Redirect to the OAuth initiation endpoint
    window.location.href = "/api/auth/notion";
  };

  //   const handleDisconnectAccount = async (accountId: string) => {
  //     if (
  //       !confirm(
  //         "Are you sure you want to disconnect this Notion account? This will remove all synced data."
  //       )
  //     ) {
  //       return;
  //     }

  //     try {
  //       setIsDisconnecting(accountId);
  //       const { removeNotionAccount } = await import("@/app/server");
  //       await removeNotionAccount(accountId);
  //       // Redirect to show success message
  //       window.location.href = "/settings?success=notion_disconnected";
  //     } catch (error) {
  //       console.error("Failed to disconnect account:", error);
  //       window.location.href = "/settings?error=disconnect_failed";
  //     }
  //   };

  //   const handleSyncAccount = async (accountId: string) => {
  //     try {
  //       setIsSyncing(accountId);
  //       const { triggerNotionSync } = await import("@/app/server");
  //       await triggerNotionSync(accountId);
  //       // Redirect to show success message
  //       window.location.href = "/settings?success=notion_synced";
  //     } catch (error) {
  //       console.error("Failed to sync account:", error);
  //       window.location.href = "/settings?error=sync_failed";
  //     }
  //   };

  return (
    <div className="space-y-6">
      {/* Main Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-lg">
                  N
                </span>
              </div>
              <div>
                <CardTitle>Notion Integration</CardTitle>
                <CardDescription>
                  Connect your Notion workspace to sync notes and databases
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="notion-enabled">Enable</Label>
              <Switch
                id="notion-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={accounts.length === 0}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  No Notion accounts connected
                </h3>
                <p className="text-muted-foreground mb-4">
                  Connect your Notion workspace to start syncing your notes and
                  databases.
                </p>
                <Button onClick={handleConnectNotion}>
                  Connect Notion Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected Accounts */}
                <div>
                  <h4 className="font-medium mb-3">Connected Accounts</h4>
                  <div className="space-y-3">
                    {accounts.map(account => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            {account.workspaceIcon ? (
                              <span>
                                <Image
                                  src={account.workspaceIcon}
                                  alt={account.workspaceName}
                                  className="rounded-lg"
                                  width={32}
                                  height={32}
                                />
                              </span>
                            ) : (
                              <span className="text-xs font-medium">
                                {account.workspaceName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {account.workspaceName}
                              </span>
                              {/* {getStatusIcon(account.status)} */}
                              {getStatusBadge(account.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Connected {account.createdAt.toLocaleDateString()}
                              {account.lastSync && (
                                <span className="ml-2">
                                  • Last sync:{" "}
                                  {account.lastSync.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              isSyncing === account.id ||
                              isDisconnecting === account.id
                            }
                            onClick={() => handleSyncAccount(account.id)}
                          >
                            {isSyncing === account.id ? "Syncing..." : "Sync"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              isDisconnecting === account.id ||
                              isSyncing === account.id
                            }
                            onClick={() => handleDisconnectAccount(account.id)}
                          >
                            {isDisconnecting === account.id
                              ? "Disconnecting..."
                              : "Disconnect"}
                          </Button>
                        </div> */}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Add Another Account */}
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Add Another Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect additional Notion workspaces
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleConnectNotion}>
                    Add Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
