"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, language, initFromStorage } = useAppStore();

  useEffect(() => {
    initFromStorage();
  }, []);

  const isRtl = language === "he";

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          isRtl
            ? sidebarOpen ? "pr-64" : "pr-16"
            : sidebarOpen ? "pl-64" : "pl-16"
        )}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </>
  );
}
