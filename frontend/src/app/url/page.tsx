"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatDuration } from "@/lib/utils";
import {
  Globe,
  Loader2,
  Mic,
  Play,
  List,
  ExternalLink,
  MonitorPlay,
  Video,
} from "lucide-react";

export default function URLPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [engine, setEngine] = useState("local");
  const [language, setLanguage] = useState("he");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [urlInfo, setUrlInfo] = useState<any>(null);
  const [includePlaylist, setIncludePlaylist] = useState(false);

  const fetchInfo = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setUrlInfo(null);

    try {
      const info = await api.getUrlInfo(url);
      setUrlInfo(info);
    } catch (err: any) {
      alert(`לא הצלחנו לקרוא את הקישור: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startTranscription = async () => {
    setIsTranscribing(true);
    try {
      const result = await api.transcribeUrl(url, engine, language, includePlaylist) as any;
      // Always go to projects — transcription runs in background
      router.push("/projects");
    } catch (err: any) {
      alert(`שגיאה: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const getPlatformIcon = (platform?: string) => {
    if (platform === "youtube") return MonitorPlay;
    if (platform === "vimeo") return Video;
    return Globe;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">תמלול מ-URL</h1>
        <p className="text-muted-foreground mt-1">
          הדבק קישור לסרטון YouTube, Vimeo, או כל אתר וידאו אחר
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=... או https://vimeo.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInfo()}
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              dir="ltr"
            />
          </div>
          <button
            onClick={fetchInfo}
            disabled={isLoading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-secondary text-primary font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "בדוק"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          תומך ב-YouTube, Vimeo, Dailymotion, Facebook, TikTok ועוד 1000+ אתרים
        </p>
      </div>

      {/* URL Info Preview */}
      {urlInfo && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in">
          {/* Thumbnail */}
          {urlInfo.thumbnail_url && (
            <div className="relative h-48 bg-muted overflow-hidden">
              <img
                src={urlInfo.thumbnail_url}
                alt={urlInfo.title}
                className="w-full h-full object-cover"
              />
              {urlInfo.duration_seconds && (
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-lg">
                  {formatDuration(urlInfo.duration_seconds)}
                </div>
              )}
              <div className="absolute top-3 right-3">
                {(() => {
                  const PIcon = getPlatformIcon(urlInfo.platform);
                  return (
                    <div className="bg-white/90 rounded-lg p-1.5">
                      <PIcon className="w-5 h-5 text-primary" />
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-lg" dir="auto">
              {urlInfo.title}
            </h3>

            {/* Playlist info */}
            {urlInfo.is_playlist && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">
                    פלייליסט — {urlInfo.playlist_count} סרטונים
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePlaylist}
                    onChange={(e) => setIncludePlaylist(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">תמלל הכל</span>
                </label>
              </div>
            )}

            {/* Playlist entries */}
            {urlInfo.is_playlist && urlInfo.entries && includePlaylist && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {urlInfo.entries.map((entry: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 text-sm"
                  >
                    <span className="text-muted-foreground w-6 text-center">{idx + 1}</span>
                    <span className="truncate flex-1" dir="auto">{entry.title}</span>
                    {entry.duration_seconds && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(entry.duration_seconds)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options */}
      {urlInfo && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div className="space-y-2">
            <label className="text-sm font-medium">מנוע תמלול</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="local">🖥️ Whisper מקומי (חינם)</option>
              <option value="groq">⚡ Groq Whisper ($0.04/שעה)</option>
              <option value="gemini">🌐 Google Gemini</option>
              <option value="huggingface">🇮🇱 ivrit-ai (עברית)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">שפה</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="he">🇮🇱 עברית</option>
              <option value="en">🇺🇸 English</option>
              <option value="ar">🇸🇦 العربية</option>
              <option value="ru">🇷🇺 Русский</option>
            </select>
          </div>
        </div>
      )}

      {/* Start Button */}
      {urlInfo && (
        <button
          onClick={startTranscription}
          disabled={isTranscribing}
          className={cn(
            "w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300",
            isTranscribing
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 animate-pulse-pink"
          )}
        >
          {isTranscribing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              מוריד ומתמלל...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Mic className="w-5 h-5" />
              {includePlaylist && urlInfo.is_playlist
                ? `תמלל ${urlInfo.playlist_count} סרטונים`
                : "הורד ותמלל"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
