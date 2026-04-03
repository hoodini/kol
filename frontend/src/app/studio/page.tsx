"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Segment, type StudioData } from "@/lib/api";
import { cn, formatTime } from "@/lib/utils";
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

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
      alert(`שגיאה בשמירה: ${err.message}`);
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
      alert(`שגיאה בייצוא: ${err.message}`);
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
        <p className="text-lg text-muted-foreground">פרויקט לא נמצא</p>
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

      {/* Header */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.project.name}</h1>
          <p className="text-sm text-muted-foreground">
            גרסה {data.version_number} מתוך {data.total_versions} • {segments.length} סגמנטים
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
            {saved ? "נשמר!" : "שמור"}
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Download className="w-4 h-4" />
              ייצוא
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
                    {fmt === "txt" && "טקסט (.txt)"}
                    {fmt === "json" && "JSON (.json)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Player */}
      <div className="px-6 sticky top-0 z-30 bg-background/80 backdrop-blur-lg pb-4">
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
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">🎬 וידאו</span>
                )}
                <span className="text-sm text-muted-foreground font-mono" dir="ltr">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Editor */}
      <div className="px-6 pb-8 space-y-2">
        {segments.map((seg) => {
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
              {/* Timestamp range */}
              <div className="flex-shrink-0 w-28 pt-1 space-y-0.5">
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

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border" dir="ltr">
        <kbd className="font-mono">⌘S</kbd> Save · <kbd className="font-mono">F2</kbd> Play/Pause · Click timestamp to seek
      </div>
    </div>
  );
}
