'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { NotionAccount, NotionIntegrationStats } from '@/lib/notion/types';
import { Calendar, Database, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface NotionIntegrationProps {
  accounts: NotionAccount[];
  stats: NotionIntegrationStats | null;
}

export function NotionIntegration({ accounts, stats }: NotionIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(accounts.length > 0);
  
  const getStatusIcon = (status: NotionAccount['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: NotionAccount['status']) => {
    const variants = {
      connected: 'default',
      error: 'destructive',
      disconnected: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleConnectNotion = () => {
    // Redirect to the OAuth initiation endpoint
    window.location.href = '/api/auth/notion';
  };

  const handleDisconnectAccount = (accountId: string) => {
    // TODO: Implement account disconnection
    console.log('Disconnecting account:', accountId);
  };

  return (
    <div className="space-y-6">
      {/* Main Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-lg">N</span>
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
                <h3 className="text-lg font-medium mb-2">No Notion accounts connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your Notion workspace to start syncing your notes and databases.
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
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            {account.workspaceIcon ? (
                              <span>{account.workspaceIcon}</span>
                            ) : (
                              <span className="text-xs font-medium">
                                {account.workspaceName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{account.workspaceName}</span>
                              {getStatusIcon(account.status)}
                              {getStatusBadge(account.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Connected {account.connectedAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(account.id)}
                        >
                          Disconnect
                        </Button>
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

      {/* Stats Card */}
      {stats && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Statistics</CardTitle>
            <CardDescription>
              Overview of your Notion integration activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalDatabases}</div>
                  <div className="text-sm text-muted-foreground">Databases</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalPages}</div>
                  <div className="text-sm text-muted-foreground">Pages</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {stats.lastSync ? stats.lastSync.toLocaleDateString() : 'Never'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Sync</div>
                </div>
              </div>
            </div>
            {stats.syncErrors > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {stats.syncErrors} sync error{stats.syncErrors !== 1 ? 's' : ''} detected
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}