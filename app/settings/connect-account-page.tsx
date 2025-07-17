import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotionAccountsDatabaseReturn } from "@/lib/db/types";
import { Database, Trash } from "lucide-react";
import Image from "next/image";
import ConnectNotionButton from "./connect-notion-button";
import { Button } from "@/components/ui/button";
import { deleteNotionAccount } from "@/lib/actions/notion";

export default function ConnectAccountPage({
  accounts,
}: {
  accounts: NotionAccountsDatabaseReturn[];
}) {
  return (
    <main className="flex h-full max-h-[calc(100vh-270px)] flex-1 flex-col overflow-hidden">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  No Notion accounts connected
                </h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Notion workspace to start syncing your notes and
                  databases.
                </p>
                <ConnectNotionButton />
              </div>
            ) : (
              <div className="space-y-4">
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
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Connected {account.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button variant="destructive" size="icon" onClick={() => deleteNotionAccount(account.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
