import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import LightDarkSwitch from "./light-dark-switch";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="p-4 md:p-6 md:px-24 border-b border-border">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black tracking-tighter">Renote</h1>
        <div className="flex gap-4">
          <LightDarkSwitch />
          <SignedOut>
            <Button asChild variant={"ghost"} size={"default"}>
              <SignInButton />
            </Button>
            <Button asChild variant={"default"} size={"default"}>
              <SignUpButton />
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
