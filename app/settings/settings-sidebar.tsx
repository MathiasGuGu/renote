"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  BarChart,
  ChevronRight,
  Folder,
  Globe,
  HelpCircle,
  LogOut,
  Logs,
  Paintbrush,
  RefreshCcw,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";

import { NotionAccountsDatabaseReturn } from "@/lib/db/types";
import ConnectAccountPage from "./connect-account-page";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ManualSyncingPage from "./manual-syncing-page";
import AppearancePage from "./appearance-page";
import { Separator } from "@/components/ui/separator";
import AccountPage from "./account-page";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

enum SettingsPages {
  Account = "Account",
  ConnectNotionAccount = "Connect Notion Account",
  ManualSyncing = "Manual Syncing",
  Appearance = "Appearance",
  Statistics = "Statistics",
  Logs = "Logs",
  Preferences = "Preferences",
  Syncing = "Syncing",
  Questions = "Questions",
}

const data = {
  nav: [
    { name: SettingsPages.ConnectNotionAccount, icon: Globe },
    { name: SettingsPages.Account, icon: User },
    [
      { name: SettingsPages.Preferences, icon: Settings },
      { name: SettingsPages.Syncing, icon: RefreshCcw },
      { name: SettingsPages.Questions, icon: HelpCircle },
    ],
    { name: SettingsPages.ManualSyncing, icon: RefreshCcw },
    { name: SettingsPages.Appearance, icon: Paintbrush },
    { name: SettingsPages.Appearance, icon: Paintbrush },

  ],
};

const adminData = {
  nav: [
    { name: SettingsPages.Statistics, icon: BarChart },
    { name: SettingsPages.Logs, icon: Logs },
  ],
};

export default function SettingsSidebar({
  accounts,
}: {
  accounts: NotionAccountsDatabaseReturn[];
}) {
  const [activePage, setActivePage] = useState(
    SettingsPages.ConnectNotionAccount
  );
  return (
    <SidebarProvider className="items-start h-full max-h-full min-h-0">
      <Sidebar
        collapsible="none"
        className="hidden md:flex bg-transparent border-r border-border h-full"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="">
                <p className="text-sm text-muted-foreground ml-2 mb-2">
                  GENERAL
                </p>
                {data.nav.map((item, index) => (
                  <Tree
                    key={index}
                    item={item}
                    activePage={activePage}
                    setActivePage={setActivePage}
                  />
                ))}
                <Separator />

                <p className="text-sm text-muted-foreground ml-2 mb-2 mt-2">
                  ADMIN
                </p>
                {adminData.nav.map(item => (
                  <SidebarMenuItem key={item.name} className="">
                    <SidebarMenuButton
                      asChild
                      isActive={item.name === activePage}
                    >
                      <Button
                        variant="ghost"
                        className="h-12 items-center justify-start"
                      >
                        <item.icon />
                        <span>{item.name}</span>
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="px-8 w-full">
        {activePage === SettingsPages.ConnectNotionAccount && (
          <ConnectAccountPage accounts={accounts} />
        )}
        {activePage === SettingsPages.ManualSyncing && <ManualSyncingPage />}
        {activePage === SettingsPages.Appearance && <AppearancePage />}
        {activePage === SettingsPages.Account && <AccountPage />}
        {activePage === SettingsPages.Logs && <AccountPage />}
        {activePage === SettingsPages.Statistics && <AccountPage />}
      </div>
    </SidebarProvider>
  );
}

function Tree({
  item,
  activePage,
  setActivePage,
}: {
  item:
    | { name: string; icon: React.ElementType }
    | { name: string; icon: React.ElementType }[];
  activePage: SettingsPages;
  setActivePage: (page: SettingsPages) => void;
}) {
  const [element, ...items] = Array.isArray(item) ? item : [item];

  if (!items.length) {
    return (
      <SidebarMenuItem key={element.name} className="">
        <SidebarMenuButton
          asChild
          isActive={element.name === activePage}
          onClick={() => setActivePage(element.name)}
        >
          <Button variant="ghost" className="h-12 items-center justify-start">
            <element.icon />
            <span>{element.name}</span>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={element.name === "components" || element.name === "ui"}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton asChild>
            <Button variant="ghost" className="h-12 items-center justify-start">
              <ChevronRight className="transition-transform" />
              <element.icon />
              <span>{element.name}</span>
            </Button>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <Tree
                key={index}
                item={subItem}
                activePage={activePage}
                setActivePage={setActivePage}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
