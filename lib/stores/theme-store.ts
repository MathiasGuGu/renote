import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setMounted: (mounted: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      mounted: false,
      setTheme: (theme: Theme) => {
        set({ theme });
        // Update document class only if mounted
        if (typeof window !== "undefined" && get().mounted) {
          if (theme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      },
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme: Theme = currentTheme === "dark" ? "light" : "dark";
        get().setTheme(newTheme);
      },
      setMounted: (mounted: boolean) => {
        set({ mounted });
        if (mounted && typeof window !== "undefined") {
          // Apply the current theme to the DOM when mounted
          const currentTheme = get().theme;
          if (currentTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }

          // If no theme is stored, use system preference
          if (currentTheme === "light") {
            const systemPrefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches;
            if (systemPrefersDark) {
              get().setTheme("dark");
            }
          }
        }
      },
    }),
    {
      name: "theme-storage",
      partialize: state => ({ theme: state.theme }),
    }
  )
);
