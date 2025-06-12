"use client";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useEffect } from "react";

export default function LightDarkSwitch() {
  const { theme, mounted, toggleTheme, setMounted } = useThemeStore();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, [setMounted]);

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
