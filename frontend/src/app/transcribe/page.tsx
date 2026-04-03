"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Engine } from "@/lib/api";
import { cn, formatFileSize } from "@/lib/utils";
import {
  Upload,
  X,
  Mic,
  Loader2,
  FileAudio,
  FileVideo,
  FolderOpen,
  ChevronDown,
} from "lucide-react";

const ACCEPTED_TYPES = [
  "audio/*",
  "video/*",
  ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac",
  ".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv",
].join(",");

export default function TranscribePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [engine, setEngine] = useState("local");
  const [language, setLanguage] = useState("he");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [folderPath, setFolderPath] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startTranscription = async () => {
    if (files.length === 0 && !folderPath) return;
    setIsUploading(true);

    try {
      if (folderPath) {
        const result = await api.transcribeFolder(folderPath, engine, language);
        router.push("/projects");
      } else if (files.length === 1) {
        const result = await api.uploadFile(files[0], engine, language);
        router.push(`/projects`);
      } else {
        const result = await api.uploadMultiple(files, engine, language);
        router.push("/projects");
      }
    } catch (err: any) {
      alert(`שגיאה: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("video/")) return FileVideo;
    return FileAudio;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">תמלול חדש</h1>
        <p className="text-muted-foreground mt-1">
          העלה קבצים, גרור לכאן, או ציין נתיב לתיקייה
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-secondary/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className={cn("w-8 h-8 text-primary", isDragging && "animate-bounce")} />
          </div>
          <div>
            <p className="text-lg font-medium">גרור קבצים לכאן</p>
            <p className="text-sm text-muted-foreground">
              או לחץ לבחירת קבצים • אודיו ווידאו בכל פורמט
            </p>
          </div>
        </div>
      </div>

      {/* Folder path input */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <FolderOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="או הדבק נתיב לתיקייה: /Users/me/courses/..."
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="w-full pr-11 pl-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            dir="ltr"
          />
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} קבצים נבחרו
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, idx) => {
              const Icon = getFileIcon(file);
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium truncate max-w-xs" dir="ltr">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        {/* Engine */}
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

        {/* Language */}
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
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
          </select>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={startTranscription}
        disabled={isUploading || (files.length === 0 && !folderPath)}
        className={cn(
          "w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300",
          isUploading || (files.length === 0 && !folderPath)
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 animate-pulse-pink"
        )}
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            מעלה ומתמלל...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Mic className="w-5 h-5" />
            התחל תמלול
          </span>
        )}
      </button>
    </div>
  );
}
