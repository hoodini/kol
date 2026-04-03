"use client";

import { useEffect, useState } from "react";
import { api, type Settings } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Settings as SettingsIcon, Moon, Sun, Key, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const { darkMode, toggleDarkMode } = useAppStore();

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">הגדרות</h1>
        <p className="text-muted-foreground mt-1">הגדרות מנועי תמלול ומפתחות API</p>
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          מראה
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">מצב כהה</span>
          <button
            onClick={toggleDarkMode}
            className={cn(
              "w-12 h-7 rounded-full transition-colors relative",
              darkMode ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-1 transition-all",
                darkMode ? "right-1" : "left-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Key className="w-5 h-5" />
          מפתחות API
        </h2>
        <p className="text-sm text-muted-foreground">
          הגדר מפתחות בקובץ <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">.env</code> בתיקיית הפרויקט
        </p>

        <div className="space-y-3">
          {[
            { name: "Groq", set: settings?.groq_api_key_set, envKey: "GROQ_API_KEY" },
            { name: "Google Gemini", set: settings?.gemini_api_key_set, envKey: "GEMINI_API_KEY" },
            { name: "HuggingFace", set: settings?.huggingface_api_key_set, envKey: "HUGGINGFACE_API_KEY" },
          ].map((key) => (
            <div key={key.name} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div>
                <span className="text-sm font-medium">{key.name}</span>
                <span className="text-xs text-muted-foreground mr-2">({key.envKey})</span>
              </div>
              {key.set ? (
                <span className="flex items-center gap-1 text-emerald-500 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> מוגדר
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <XCircle className="w-4 h-4" /> לא מוגדר
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Default Settings */}
      {settings && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            ברירות מחדל
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>מנוע ברירת מחדל</span>
              <span className="text-primary font-medium">{settings.default_engine}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>שפה</span>
              <span className="text-primary font-medium">{settings.default_language}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>מודל Whisper</span>
              <span className="text-primary font-medium">{settings.whisper_model}</span>
            </div>
          </div>
        </div>
      )}

      {/* Credits */}
      <div className="rounded-2xl border border-border bg-gradient-to-bl from-secondary to-accent p-6 text-center space-y-3">
        <h2 className="text-xl font-bold">
          קול <span className="text-primary">Kol</span> v1.0
        </h2>
        <p className="text-sm text-muted-foreground">סטודיו תמלול מקצועי</p>
        <div className="text-sm">
          <p>
            נבנה על ידי{" "}
            <a href="https://yuv.ai" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
              Yuval Avidani
            </a>
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-muted-foreground">
            <a href="https://x.com/yuvalav" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">𝕏 @yuvalav</a>
            <a href="https://instagram.com/yuval_770" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">IG</a>
            <a href="https://tiktok.com/@yuval.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">TikTok</a>
            <a href="https://github.com/hoodini" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
            <a href="https://facebook.com/yuval.avidani" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">FB</a>
            <a href="https://linktr.ee/yuvai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkTree</a>
          </div>
        </div>
      </div>
    </div>
  );
}
