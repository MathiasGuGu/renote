"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";

function ThemeInitializer() {
  const setMounted = useThemeStore(state => state.setMounted);

  useEffect(() => {
    setMounted(true);
  }, [setMounted]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      {children}
    </>
  );
}
