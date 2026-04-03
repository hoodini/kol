"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  Mic,
  FolderOpen,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Upload,
  Globe,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/", label: "דף הבית", icon: Sparkles },
  { href: "/transcribe", label: "תמלול חדש", icon: Mic },
  { href: "/projects", label: "פרויקטים", icon: FolderOpen },
  { href: "/url", label: "מ-YouTube / URL", icon: Globe },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-40 h-full bg-sidebar-bg border-l border-border transition-all duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">
                קול <span className="text-primary">Kol</span>
              </span>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-sidebar-hover transition-colors"
            title={sidebarOpen ? "סגור סרגל צד" : "פתח סרגל צד"}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-5 h-5 text-muted-foreground" />
            ) : (
              <PanelRightOpen className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium animate-fade-in">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Credits */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="text-[10px] text-muted-foreground text-center space-y-1">
              <p>
                נבנה על ידי{" "}
                <a
                  href="https://yuv.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Yuval Avidani
                </a>
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <a href="https://x.com/yuvalav" target="_blank" rel="noopener noreferrer" className="hover:text-primary">𝕏</a>
                <span>·</span>
                <a href="https://instagram.com/yuval_770" target="_blank" rel="noopener noreferrer" className="hover:text-primary">IG</a>
                <span>·</span>
                <a href="https://tiktok.com/@yuval.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary">TT</a>
                <span>·</span>
                <a href="https://github.com/hoodini" target="_blank" rel="noopener noreferrer" className="hover:text-primary">GH</a>
                <span>·</span>
                <a href="https://linktr.ee/yuvai" target="_blank" rel="noopener noreferrer" className="hover:text-primary">🔗</a>
              </div>
            </div>
          </div>
        )}
      </aside>

    </>
  );
}
