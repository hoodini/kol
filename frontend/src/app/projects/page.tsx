"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/api";
import { cn, formatDuration, formatTime } from "@/lib/utils";
import {
  Search,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Pencil,
  Trash2,
  MonitorPlay,
  Video,
  FileAudio,
  Globe,
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProjects();
    // Auto-refresh every 3s if any project is in progress
    const interval = setInterval(() => {
      if (projects.some((p) => ["processing", "downloading", "pending"].includes(p.status))) {
        loadProjects();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [projects.length]);

  const loadProjects = async () => {
    try {
      const data = await api.listProjects(search ? { search } : undefined);
      setProjects(data.projects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadProjects();
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle2, color: "text-emerald-500", label: "הושלם" };
      case "processing":
        return { icon: Loader2, color: "text-primary animate-spin", label: "מתמלל..." };
      case "downloading":
        return { icon: Download, color: "text-blue-500 animate-bounce", label: "מוריד..." };
      case "error":
        return { icon: AlertCircle, color: "text-destructive", label: "שגיאה" };
      default:
        return { icon: Clock, color: "text-muted-foreground", label: "ממתין" };
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "youtube": return MonitorPlay;
      case "vimeo": return Video;
      case "url": return Globe;
      default: return FileAudio;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">פרויקטים</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} פרויקטים
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="חפש פרויקטים..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-11 pl-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </form>

      {/* Project List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">אין פרויקטים עדיין</p>
          <Link
            href="/transcribe"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            התחל תמלול ראשון
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const status = getStatusInfo(project.status);
            const StatusIcon = status.icon;
            const SourceIcon = getSourceIcon(project.source_type);

            return (
              <Link
                key={project.id}
                href={project.status === "completed" ? `/studio?id=${project.id}` : "#"}
                className={cn(
                  "block rounded-2xl border border-border bg-card p-4 transition-all duration-200",
                  project.status === "completed"
                    ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                    : "opacity-80"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail or Icon */}
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <SourceIcon className="w-7 h-7 text-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0" dir="ltr">
                        {project.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <StatusIcon className={cn("w-4 h-4", status.color)} />
                        {status.label}
                      </span>
                      {project.duration_seconds && (
                        <span>{formatDuration(project.duration_seconds)}</span>
                      )}
                      {project.engine_used && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {project.engine_used}
                        </span>
                      )}
                    </div>

                    {/* Error message */}
                    {project.status === "error" && project.error_message && (
                      <p className="mt-1.5 text-xs text-destructive/80 truncate" dir="ltr" title={project.error_message}>
                        {project.error_message.length > 120
                          ? project.error_message.slice(0, 120) + "..."
                          : project.error_message}
                      </p>
                    )}

                    {/* Progress bar for in-progress */}
                    {(project.status === "processing" || project.status === "downloading") && (
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-sm text-muted-foreground text-left flex-shrink-0">
                    {new Date(project.created_at).toLocaleDateString("he-IL")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
