/**
 * Blitz AI - Global App Store
 * Manages sidebar state, theme, language, and global UI state.
 */

import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  language: Lang;
  setLanguage: (lang: Lang) => void;
  initFromStorage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("kol-dark-mode", JSON.stringify(next));
      }
      return { darkMode: next };
    }),
  language: "he",
  setLanguage: (lang) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
      localStorage.setItem("kol-language", lang);
    }
    set({ language: lang });
  },
  initFromStorage: () => {
    if (typeof window === "undefined") return;
    const savedDark = localStorage.getItem("kol-dark-mode");
    const savedLang = localStorage.getItem("kol-language") as Lang | null;
    const darkMode = savedDark === "true";
    const language = savedLang === "en" ? "en" : "he";

    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";

    set({ darkMode, language });
  },
}));
