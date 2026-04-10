"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/api";
import { cn, formatDuration, formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
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
  Timer,
  Check,
  X,
  Plus,
  RotateCcw,
} from "lucide-react";

function formatElapsed(seconds: number, lang: "he" | "en"): string {
  if (seconds < 60) return `${Math.floor(seconds)} ${t("time.secShort", lang)}`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")} ${t("time.minShort", lang)}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")} ${t("time.hourShort", lang)}`;
}

function useElapsedTimers(projects: Project[]) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const hasActive = projects.some((p) =>
      ["processing", "downloading", "pending"].includes(p.status)
    );
    if (!hasActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [projects]);

  return now;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const now = useElapsedTimers(projects);
  const { language } = useAppStore();

  useEffect(() => {
    loadProjects();
    const interval = setInterval(() => {
      if (projects.some((p) => ["processing", "downloading", "pending"].includes(p.status))) {
        loadProjects();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [projects.length]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

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

  const startRename = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const confirmRename = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!renamingId || !renameValue.trim()) return;
    try {
      await api.updateProject(renamingId, { name: renameValue.trim() });
      setProjects((prev) =>
        prev.map((p) => (p.id === renamingId ? { ...p, name: renameValue.trim() } : p))
      );
    } catch (err: any) {
      console.error("Rename failed:", err);
    }
    setRenamingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingId(null);
  };

  const deleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("projects.confirmDelete", language))) return;
    try {
      await api.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      console.error("Delete failed:", err);
    }
  };

  const retryProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.retryProject(projectId, "groq");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: "pending", progress: 0, error_message: undefined } : p
        )
      );
    } catch (err: any) {
      console.error("Retry failed:", err);
    }
  };

  const retryAllFailed = async () => {
    try {
      const result = await api.retryAllFailed("groq");
      if (result.count > 0) {
        setProjects((prev) =>
          prev.map((p) =>
            result.project_ids.includes(p.id)
              ? { ...p, status: "pending", progress: 0, error_message: undefined }
              : p
          )
        );
      }
    } catch (err: any) {
      console.error("Retry all failed:", err);
    }
  };

  const hasFailedProjects = projects.some((p) => p.status === "error");

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle2, color: "text-emerald-500", label: t("status.completed", language) };
      case "processing":
        return { icon: Loader2, color: "text-primary animate-spin", label: t("status.processing", language) };
      case "downloading":
        return { icon: Download, color: "text-blue-500 animate-bounce", label: t("status.downloading", language) };
      case "error":
        return { icon: AlertCircle, color: "text-destructive", label: t("status.error", language) };
      default:
        return { icon: Clock, color: "text-muted-foreground", label: t("status.pending", language) };
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
          <h1 className="text-3xl font-bold">{t("projects.title", language)}</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} {t("projects.count", language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFailedProjects && (
            <button
              onClick={retryAllFailed}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {t("projects.retryAll", language)}
            </button>
          )}
          <Link
            href="/transcribe"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {t("nav.transcribe", language)}
          </Link>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className={cn("absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground", language === "he" ? "right-3" : "left-3")} />
        <input
          type="text"
          placeholder={t("projects.search", language)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
            language === "he" ? "pr-11 pl-4" : "pl-11 pr-4"
          )}
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
          <p className="text-lg text-muted-foreground">{t("projects.empty", language)}</p>
          <Link
            href="/transcribe"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {t("projects.startFirst", language)}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const status = getStatusInfo(project.status);
            const StatusIcon = status.icon;
            const SourceIcon = getSourceIcon(project.source_type);
            const isRenaming = renamingId === project.id;

            return (
              <div key={project.id} className="relative group">
                <Link
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
                        {isRenaming ? (
                          <form onSubmit={confirmRename} className="flex items-center gap-2 flex-1" onClick={(e) => e.preventDefault()}>
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => { if (e.key === "Escape") { setRenamingId(null); } }}
                              className="flex-1 px-2 py-1 text-sm font-semibold rounded-lg border border-primary/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <button
                              type="submit"
                              onClick={confirmRename}
                              className="p-1 rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelRename}
                              className="p-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <h3 className="font-semibold truncate">{project.name}</h3>
                            <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0" dir="ltr">
                              {project.id.slice(0, 8)}
                            </span>
                          </>
                        )}
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

                      {/* Progress section for in-progress */}
                      {(project.status === "processing" || project.status === "downloading") && (() => {
                        const elapsed = (now - new Date(project.created_at).getTime()) / 1000;
                        const pct = Math.max(project.progress, 0.1);
                        const estimatedTotal = elapsed / (pct / 100);
                        const remaining = Math.max(estimatedTotal - elapsed, 0);
                        return (
                          <div className="mt-2 space-y-1.5">
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-l from-primary to-purple-400 rounded-full transition-all duration-500"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground" dir="ltr">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-medium text-primary">
                                  {Math.round(project.progress)}%
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {formatElapsed(elapsed, language)}
                                </span>
                              </div>
                              {project.progress > 5 && (
                                <span>
                                  ~{formatElapsed(remaining, language)} {t("status.remaining", language)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Actions + Date */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isRenaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {project.status === "error" && (
                            <button
                              onClick={(e) => retryProject(e, project.id)}
                              className="p-2 rounded-lg hover:bg-primary/10 text-primary hover:text-primary transition-colors"
                              title={t("projects.retry", language)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => startRename(e, project)}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title={t("projects.rename", language)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => deleteProject(e, project.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title={t("projects.delete", language)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground text-left">
                        {new Date(project.created_at).toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
