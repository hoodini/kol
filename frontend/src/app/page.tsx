"use client";

import Link from "next/link";
import {
  Mic,
  Globe,
  FolderOpen,
  Upload,
  Sparkles,
  Zap,
  Languages,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "תמלול מקומי",
    description: "Whisper V3 Large רץ על המחשב שלך — ללא עלויות, ללא ענן",
  },
  {
    icon: Zap,
    title: "מנועי ענן",
    description: "Groq, Gemini, ivrit-ai — בחר את המנוע המתאים לך",
  },
  {
    icon: Languages,
    title: "עברית first",
    description: "אופטימיזציה מלאה לעברית עם מודלים ייעודיים",
  },
  {
    icon: Globe,
    title: "YouTube & Vimeo",
    description: "הדבק קישור — אנחנו מורידים ומתמללים אוטומטית",
  },
  {
    icon: FileText,
    title: "כל הפורמטים",
    description: "SRT, VTT, ASS, TXT, JSON — לכל עורך וידאו",
  },
  {
    icon: FolderOpen,
    title: "תיקיות שלמות",
    description: "תמלל קורסים שלמים בלחיצה אחת",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm text-primary font-medium">
          <Sparkles className="w-4 h-4" />
          סטודיו תמלול מקצועי
        </div>
        <h1 className="text-5xl font-bold">
          קול <span className="text-primary">Kol</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          תמלול מדויק לכל אורך, בכל שפה, עם דגש על עברית.
          <br />
          העלה קבצים, הדבק קישורים, או סרוק תיקיות שלמות.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/transcribe"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <Upload className="w-6 h-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">העלאת קבצים</h3>
              <p className="text-sm text-muted-foreground">גרור קבצי אודיו או וידאו</p>
            </div>
          </div>
        </Link>

        <Link
          href="/url"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <Globe className="w-6 h-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">מ-YouTube / URL</h3>
              <p className="text-sm text-muted-foreground">הדבק קישור לסרטון או פלייליסט</p>
            </div>
          </div>
        </Link>

        <Link
          href="/projects"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <FolderOpen className="w-6 h-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">פרויקטים</h3>
              <p className="text-sm text-muted-foreground">צפה בהיסטוריית התמלולים</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">למה קול?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-card/50 p-5 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
