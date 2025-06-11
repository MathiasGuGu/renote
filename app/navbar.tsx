import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import LightDarkSwitch from "./light-dark-switch";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

export default function Navbar() {
  return (
    <header className="p-4 md:p-6 md:px-24 border-b border-border">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="text-xl font-black tracking-tighter hover:opacity-80 transition-opacity"
        >
          Renote
        </Link>
        <div className="flex gap-2 items-center">
          <LightDarkSwitch />
          <SignedIn>
            <div className="flex gap-4 items-center">
              <Button asChild variant={"ghost"} size={"icon"}>
                <Link href="/settings">
                  <Plus size={20} className="text-muted-foreground" />
                </Link>
              </Button>
              <UserButton />
            </div>
          </SignedIn>
          <SignedOut>
            <Button asChild variant={"ghost"} size={"default"}>
              <SignInButton />
            </Button>
            <Button asChild variant={"default"} size={"default"}>
              <SignUpButton />
            </Button>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
