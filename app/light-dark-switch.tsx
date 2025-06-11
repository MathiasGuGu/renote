"use client";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

export default function LightDarkSwitch() {
  const { isDark, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button
        size={"icon"}
        variant={"ghost"}
        className="flex items-center gap-2"
      >
        <SunIcon className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      size={"icon"}
      variant={"ghost"}
      className="flex items-center gap-2"
      onClick={toggleTheme}
    >
      <SunIcon className={`w-4 h-4 ${isDark ? "hidden" : ""}`} />
      <MoonIcon className={`w-4 h-4 ${isDark ? "" : "hidden"}`} />
    </Button>
  );
}
