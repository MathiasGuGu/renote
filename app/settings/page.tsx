import { getNotionAccountsByClerkId } from "@/lib/data/notion";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ConnectNotionButton from "./connect-notion-button";
import SettingsSidebar from "./settings-sidebar";

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in");
  }

  const notionAccounts = await getNotionAccountsByClerkId(clerkId!);

  return (
    <div className="size-screen pt-12 flex flex-col  max-w-5xl mx-auto  gap-4">
      <div className="pl-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <SettingsSidebar accounts={notionAccounts} />
    </div>
  );
}
