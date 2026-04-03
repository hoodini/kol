"use client";

import { Sidebar } from "./sidebar";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          sidebarOpen ? "pr-64" : "pr-16"
        )}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </>
  );
}
