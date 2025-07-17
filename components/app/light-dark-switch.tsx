"use client";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export default function LightDarkSwitch() {
  const isDark = true;

  const toggleTheme = () => {
    const currentTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", currentTheme);
    console.log("toggleTheme");
  };

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
