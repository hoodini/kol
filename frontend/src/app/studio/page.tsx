"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Segment, type StudioData } from "@/lib/api";
import { cn, formatTime } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import {
  Play,
  Pause,
  Save,
  Download,
  Loader2,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronDown,
  History,
  CheckCircle2,
  ArrowUp,
  Pencil,
  Check,
  X,
  Users,
  UserPen,
  Merge,
  Trash2,
  Filter,
  Eraser,
} from "lucide-react";

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [data, setData] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [editedSegments, setEditedSegments] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Speaker diarization state
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [diarizing, setDiarizing] = useState(false);
  const [diarizeComplete, setDiarizeComplete] = useState(false);
  const [showSpeakerPanel, setShowSpeakerPanel] = useState(false);
  const [renamingSpeaker, setRenamingSpeaker] = useState<string | null>(null);
  const [speakerRenameValue, setSpeakerRenameValue] = useState("");
  const [numSpeakersInput, setNumSpeakersInput] = useState("");
  const [filterSpeaker, setFilterSpeaker] = useState<string | null>(null);
  const [mergingSpeaker, setMergingSpeaker] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { language } = useAppStore();

  // Show "back to top" button on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startRename = () => {
    if (!data) return;
    setRenameValue(data.project.name);
    setIsRenaming(true);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  };

  const confirmRename = async () => {
    if (!projectId || !renameValue.trim()) return;
    try {
      await api.updateProject(projectId, { name: renameValue.trim() });
      setData((prev) => prev ? { ...prev, project: { ...prev.project, name: renameValue.trim() } } : prev);
    } catch (err: any) {
      console.error("Rename failed:", err);
    }
    setIsRenaming(false);
  };

  useEffect(() => {
    if (projectId) loadStudioData();
  }, [projectId]);

  const loadStudioData = async () => {
    if (!projectId) return;
    try {
      // First check project status
      const project = await api.getProject(projectId);
      if (project.status === "processing" || project.status === "downloading" || project.status === "pending") {
        // Project not ready yet — poll every 2 seconds
        setTimeout(() => loadStudioData(), 2000);
        return;
      }
      if (project.status === "error") {
        setLoading(false);
        return;
      }
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
    } catch (err: any) {
      console.error("Studio load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load speakers when data is ready
  useEffect(() => {
    if (data && projectId) {
      const hasSpeakers = data.segments.some((s) => s.speaker);
      if (hasSpeakers) {
        const uniqueSpeakers = [...new Set(data.segments.map((s) => s.speaker).filter(Boolean))] as string[];
        setSpeakers(uniqueSpeakers.sort());
        setShowSpeakerPanel(true);
      }
    }
  }, [data, projectId]);

  const runDiarization = async () => {
    if (!projectId) return;
    setDiarizing(true);
    setDiarizeComplete(false);
    try {
      const numSpeakers = numSpeakersInput ? parseInt(numSpeakersInput) : undefined;
      const result = await api.diarizeProject(projectId, numSpeakers);
      setSpeakers(result.speakers);
      setShowSpeakerPanel(true);
      setDiarizeComplete(true);
      // Reload studio data with the new version
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
      setTimeout(() => setDiarizeComplete(false), 3000);
    } catch (err: any) {
      alert(`${t("diarize.error", language)}: ${err.message}`);
    } finally {
      setDiarizing(false);
    }
  };

  const handleRenameSpeaker = async (oldName: string) => {
    if (!projectId || !speakerRenameValue.trim()) return;
    try {
      const result = await api.renameSpeaker(projectId, oldName, speakerRenameValue.trim());
      setSpeakers(result.speakers);
      // Reload studio data
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setRenamingSpeaker(null);
    setSpeakerRenameValue("");
  };

  const handleMergeSpeaker = async (source: string, target: string) => {
    if (!projectId || source === target) return;
    try {
      const result = await api.mergeSpeakers(projectId, source, target);
      setSpeakers(result.speakers);
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setMergingSpeaker(null);
  };

  const handleDeleteSpeakerSegments = async (speaker: string) => {
    if (!projectId) return;
    const msg = `${t("diarize.confirmDelete", language)} "${speaker}"?`;
    if (!confirm(msg)) return;
    try {
      const result = await api.deleteSpeakerSegments(projectId, speaker);
      setSpeakers(result.speakers);
      if (filterSpeaker === speaker) setFilterSpeaker(null);
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleClearSpeakers = async () => {
    if (!projectId) return;
    if (!confirm(t("diarize.confirmClear", language))) return;
    try {
      await api.clearSpeakers(projectId);
      setSpeakers([]);
      setFilterSpeaker(null);
      setShowSpeakerPanel(false);
      const studioData = await api.getStudioData(projectId);
      setData(studioData);
      setSegments(studioData.segments);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Audio time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Find active segment
      const active = segments.find(
        (s) => audio.currentTime >= s.start_time && audio.currentTime < s.end_time
      );
      if (active && active.id !== activeSegmentId) {
        setActiveSegmentId(active.id);
        // Auto-scroll to active segment
        const el = segmentRefs.current.get(active.id);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [segments, activeSegmentId]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const updateSegmentText = (segId: string, text: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === segId ? { ...s, text } : s))
    );
    setEditedSegments((prev) => new Set(prev).add(segId));
    setSaved(false);
  };

  const saveEdits = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.saveStudioEdits(
        projectId,
        segments.map((s) => ({
          id: s.id,
          text: s.text,
          start_time: s.start_time,
          end_time: s.end_time,
          speaker: s.speaker,
        }))
      );
      setSaved(true);
      setEditedSegments(new Set());
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(`${t("studio.saveError", language)}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportTranscript = async (format: string) => {
    if (!projectId) return;
    try {
      const blob = await api.exportProject(projectId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.project.name || "transcript"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`${t("studio.exportError", language)}: ${err.message}`);
    }
    setShowExport(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") { e.preventDefault(); saveEdits(); }
        if (e.key === " ") { e.preventDefault(); togglePlay(); }
      }
      if (e.key === "F2") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [segments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">{t("studio.notFound", language)}</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4 animate-fade-in -mx-6 -my-8">
      {/* Hidden audio element (used when no video, or as fallback) */}
      {!data.project.has_video && (
        <audio ref={audioRef} src={api.getAudioUrl(projectId!)} preload="metadata" />
      )}

      {/* Sticky top section: Header + Media Player */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg transition-shadow duration-300" style={{ boxShadow: showScrollTop ? '0 4px 20px rgba(124, 58, 237, 0.08)' : 'none' }}>
        {/* Header - save/export bar */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); confirmRename(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setIsRenaming(false); }}
                    className="text-2xl font-bold px-2 py-0.5 rounded-lg border border-primary/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{data.project.name}</h1>
                  <button
                    onClick={startRename}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                    style={{ opacity: 1 }}
                    title={t("projects.rename", language)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("studio.version", language)} {data.version_number} {t("studio.of", language)} {data.total_versions} • {segments.length} {t("studio.segments", language)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={saveEdits}
              disabled={saving || editedSegments.size === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                saved
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : editedSegments.size > 0
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? t("studio.saved", language) : t("studio.save", language)}
            </button>

            {/* Diarize button */}
            <button
              onClick={() => {
                if (speakers.length > 0) {
                  setShowSpeakerPanel(!showSpeakerPanel);
                } else {
                  runDiarization();
                }
              }}
              disabled={diarizing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                diarizeComplete
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : speakers.length > 0
                    ? "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                    : "border border-border hover:bg-secondary"
              )}
            >
              {diarizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : diarizeComplete ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {diarizing
                ? t("diarize.running", language)
                : diarizeComplete
                  ? t("diarize.complete", language)
                  : speakers.length > 0
                    ? `${speakers.length} ${t("diarize.speakers", language)}`
                    : t("diarize.button", language)}
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Download className="w-4 h-4" />
                {t("studio.export", language)}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExport && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  {["srt", "vtt", "ass", "txt", "json"].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => exportTranscript(fmt)}
                      className="w-full text-right px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                    >
                      {fmt === "srt" && "SubRip (.srt)"}
                      {fmt === "vtt" && "WebVTT (.vtt)"}
                      {fmt === "ass" && "Advanced SSA (.ass)"}
                      {fmt === "txt" && (language === "he" ? "טקסט (.txt)" : "Text (.txt)")}
                      {fmt === "json" && "JSON (.json)"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Player */}
        <div className="px-6 pb-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Video player (shown when video available) */}
            {data.project.has_video && (
              <div className="relative bg-black">
                <video
                  ref={audioRef as any}
                  src={api.getVideoUrl(projectId!)}
                  preload="metadata"
                  className="w-full max-h-[360px] object-contain"
                  onClick={togglePlay}
                />
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Progress bar */}
              <div
                className="h-2 bg-secondary rounded-full cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = 1 - (e.clientX - rect.left) / rect.width;
                  seekTo(pct * duration);
                }}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all duration-100"
                  style={{ width: `${progress}%`, marginRight: 0, marginLeft: "auto" }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => skip(-5)} className="p-2 rounded-lg hover:bg-secondary">
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-0.5" />}
                  </button>
                  <button onClick={() => skip(5)} className="p-2 rounded-lg hover:bg-secondary">
                    <SkipBack className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {data.project.has_video && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">🎬 {t("studio.video", language)}</span>
                  )}
                  <span className="text-sm text-muted-foreground font-mono" dir="ltr">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Panel */}
      {showSpeakerPanel && speakers.length > 0 && (
        <div className="px-6 animate-fade-in">
          <div className="bg-violet-50/50 border border-violet-200/50 rounded-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t("diarize.button", language)} ({speakers.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearSpeakers}
                  className="text-xs text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1"
                  title={t("diarize.clearAll", language)}
                >
                  <Eraser className="w-3 h-3" />
                  {t("diarize.clearAll", language)}
                </button>
                <span className="text-violet-300">|</span>
                <button
                  onClick={runDiarization}
                  disabled={diarizing}
                  className="text-xs text-violet-600 hover:text-violet-800 transition-colors"
                >
                  {diarizing ? t("diarize.running", language) : t("diarize.runAgain", language)}
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-violet-500" />
              <button
                onClick={() => setFilterSpeaker(null)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-all",
                  filterSpeaker === null
                    ? "bg-violet-600 text-white"
                    : "bg-white/60 text-violet-700 hover:bg-white"
                )}
              >
                {t("diarize.showAll", language)}
              </button>
              {speakers.map((speaker, idx) => {
                const segCount = segments.filter((s) => s.speaker === speaker).length;
                return (
                  <button
                    key={speaker}
                    onClick={() => setFilterSpeaker(filterSpeaker === speaker ? null : speaker)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg transition-all",
                      filterSpeaker === speaker
                        ? "bg-violet-600 text-white"
                        : "bg-white/60 text-violet-700 hover:bg-white"
                    )}
                  >
                    {speaker} ({segCount})
                  </button>
                );
              })}
            </div>

            {/* Speaker cards */}
            <div className="flex flex-wrap gap-2">
              {speakers.map((speaker, idx) => {
                const colors = [
                  "bg-violet-100 text-violet-800 border-violet-300",
                  "bg-blue-100 text-blue-800 border-blue-300",
                  "bg-emerald-100 text-emerald-800 border-emerald-300",
                  "bg-amber-100 text-amber-800 border-amber-300",
                  "bg-rose-100 text-rose-800 border-rose-300",
                  "bg-cyan-100 text-cyan-800 border-cyan-300",
                  "bg-pink-100 text-pink-800 border-pink-300",
                  "bg-lime-100 text-lime-800 border-lime-300",
                ];
                const colorClass = colors[idx % colors.length];
                const segCount = segments.filter((s) => s.speaker === speaker).length;

                return (
                  <div
                    key={speaker}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
                      colorClass
                    )}
                  >
                    {renamingSpeaker === speaker ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleRenameSpeaker(speaker); }}
                        className="flex items-center gap-1"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={speakerRenameValue}
                          onChange={(e) => setSpeakerRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setRenamingSpeaker(null); }}
                          className="w-24 px-1.5 py-0.5 rounded bg-white/80 border border-current/20 text-xs focus:outline-none"
                          placeholder={t("diarize.speakerName", language)}
                        />
                        <button type="submit" className="p-0.5 rounded hover:bg-white/50">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setRenamingSpeaker(null)} className="p-0.5 rounded hover:bg-white/50">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : mergingSpeaker === speaker ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{t("diarize.mergeInto", language)}</span>
                        {speakers.filter((s) => s !== speaker).map((target) => (
                          <button
                            key={target}
                            onClick={() => handleMergeSpeaker(speaker, target)}
                            className="text-xs px-1.5 py-0.5 rounded bg-white/80 hover:bg-white transition-colors"
                          >
                            {target}
                          </button>
                        ))}
                        <button onClick={() => setMergingSpeaker(null)} className="p-0.5 rounded hover:bg-white/50">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{speaker}</span>
                        <span className="text-xs opacity-60">({segCount})</span>
                        <button
                          onClick={() => { setRenamingSpeaker(speaker); setSpeakerRenameValue(speaker); }}
                          className="p-0.5 rounded hover:bg-white/50 transition-colors"
                          title={t("diarize.renameSpeaker", language)}
                        >
                          <UserPen className="w-3.5 h-3.5" />
                        </button>
                        {speakers.length > 1 && (
                          <button
                            onClick={() => setMergingSpeaker(speaker)}
                            className="p-0.5 rounded hover:bg-white/50 transition-colors"
                            title={t("diarize.mergeSpeaker", language)}
                          >
                            <Merge className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSpeakerSegments(speaker)}
                          className="p-0.5 rounded hover:bg-rose-200/50 text-rose-600/70 transition-colors"
                          title={t("diarize.deleteSpeaker", language)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Number of speakers input for re-run */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="2"
                max="20"
                value={numSpeakersInput}
                onChange={(e) => setNumSpeakersInput(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-violet-200 bg-white/80 text-xs text-violet-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="2-20"
              />
              <span className="text-xs text-violet-600">
                {t("diarize.numSpeakers", language)} — {t("diarize.numSpeakersHint", language)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Editor */}
      <div className="px-6 pb-8 space-y-2">
        {segments.filter((seg) => !filterSpeaker || seg.speaker === filterSpeaker).map((seg) => {
          const isActive = seg.id === activeSegmentId;
          const isEdited = editedSegments.has(seg.id);
          const isLowConfidence = (seg.confidence ?? 1) < 0.7;

          return (
            <div
              key={seg.id}
              className={cn(
                "group flex gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-secondary/50 border border-transparent",
                isLowConfidence && "border-l-2 border-l-amber-400"
              )}
              onClick={() => seekTo(seg.start_time)}
            >
              {/* Speaker label + Timestamp */}
              <div className="flex-shrink-0 w-28 pt-1 space-y-1">
                {seg.speaker && (() => {
                  const speakerIdx = speakers.indexOf(seg.speaker);
                  const badgeColors = [
                    "bg-violet-100 text-violet-700",
                    "bg-blue-100 text-blue-700",
                    "bg-emerald-100 text-emerald-700",
                    "bg-amber-100 text-amber-700",
                    "bg-rose-100 text-rose-700",
                    "bg-cyan-100 text-cyan-700",
                    "bg-pink-100 text-pink-700",
                    "bg-lime-100 text-lime-700",
                  ];
                  const badgeColor = badgeColors[speakerIdx >= 0 ? speakerIdx % badgeColors.length : 0];
                  return (
                    <div className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit truncate max-w-full", badgeColor)}>
                      {seg.speaker}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground" dir="ltr">
                  <span className="text-primary font-semibold">{formatTime(seg.start_time)}</span>
                  <span className="text-muted-foreground/50">→</span>
                  <span>{formatTime(seg.end_time)}</span>
                </div>
              </div>

              {/* Text */}
              <div className="flex-1">
                <textarea
                  ref={(el) => {
                    if (el) segmentRefs.current.set(seg.id, el);
                  }}
                  value={seg.text}
                  onChange={(e) => updateSegmentText(seg.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "w-full bg-transparent border-none resize-none focus:outline-none text-sm leading-relaxed",
                    isEdited && "text-primary",
                    isLowConfidence && "bg-confidence-low/20 rounded-lg px-1"
                  )}
                  rows={Math.max(1, Math.ceil(seg.text.length / 60))}
                  dir="auto"
                />
                {/* Word-level confidence highlighting */}
                {seg.words && seg.words.length > 0 && isActive && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {seg.words.map((word, idx) => (
                      <span
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); seekTo(word.start_time); }}
                        className={cn(
                          "text-xs px-1 py-0.5 rounded cursor-pointer hover:bg-primary/10 transition-colors",
                          (word.confidence ?? 1) < 0.5
                            ? "bg-confidence-low text-red-800"
                            : (word.confidence ?? 1) < 0.7
                              ? "bg-confidence-medium text-amber-800"
                              : "text-muted-foreground"
                        )}
                        title={`ביטחון: ${((word.confidence ?? 1) * 100).toFixed(0)}%`}
                      >
                        {word.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className={cn(
          "fixed bottom-20 left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:opacity-90 hover:scale-110 z-50",
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        title={t("studio.backToTop", language)}
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border" dir="ltr">
        <kbd className="font-mono">⌘S</kbd> Save · <kbd className="font-mono">F2</kbd> Play/Pause · Click timestamp to seek
      </div>
    </div>
  );
}
