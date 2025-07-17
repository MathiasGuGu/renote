"use client";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default function ConnectNotionButton() {
  const handleConnectNotionAccount = async () => {
    redirect("/api/auth/notion");
  }
  return <Button onClick={handleConnectNotionAccount}>Connect Notion Account</Button>;
}
