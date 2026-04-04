/**
 * Blitz AI - Internationalization
 * Hebrew (he) and English (en) translations.
 */

export type Lang = "he" | "en";

const translations = {
  // Sidebar navigation
  "nav.home": { he: "דף הבית", en: "Home" },
  "nav.transcribe": { he: "פרויקט חדש", en: "New Project" },
  "nav.projects": { he: "פרויקטים", en: "Projects" },
  "nav.url": { he: "מ-YouTube / URL", en: "From YouTube / URL" },
  "nav.settings": { he: "הגדרות", en: "Settings" },

  // Sidebar
  "sidebar.close": { he: "סגור סרגל צד", en: "Close sidebar" },
  "sidebar.open": { he: "פתח סרגל צד", en: "Open sidebar" },
  "sidebar.builtBy": { he: "נבנה על ידי", en: "Built by" },
  "sidebar.darkMode": { he: "מצב כהה", en: "Dark mode" },
  "sidebar.lightMode": { he: "מצב בהיר", en: "Light mode" },
  "sidebar.language": { he: "English", en: "עברית" },

  // Projects page
  "projects.title": { he: "פרויקטים", en: "Projects" },
  "projects.count": { he: "פרויקטים", en: "projects" },
  "projects.search": { he: "חפש פרויקטים...", en: "Search projects..." },
  "projects.empty": { he: "אין פרויקטים עדיין", en: "No projects yet" },
  "projects.startFirst": { he: "התחל תמלול ראשון", en: "Start first transcription" },
  "projects.rename": { he: "שנה שם", en: "Rename" },
  "projects.delete": { he: "מחק", en: "Delete" },
  "projects.confirmDelete": { he: "למחוק את הפרויקט?", en: "Delete this project?" },

  // Project statuses
  "status.completed": { he: "הושלם", en: "Completed" },
  "status.processing": { he: "מתמלל...", en: "Processing..." },
  "status.downloading": { he: "מוריד...", en: "Downloading..." },
  "status.error": { he: "שגיאה", en: "Error" },
  "status.pending": { he: "ממתין", en: "Pending" },
  "status.remaining": { he: "נותר", en: "remaining" },

  // Studio page
  "studio.notFound": { he: "פרויקט לא נמצא", en: "Project not found" },
  "studio.version": { he: "גרסה", en: "Version" },
  "studio.of": { he: "מתוך", en: "of" },
  "studio.segments": { he: "סגמנטים", en: "segments" },
  "studio.save": { he: "שמור", en: "Save" },
  "studio.saved": { he: "נשמר!", en: "Saved!" },
  "studio.export": { he: "ייצוא", en: "Export" },
  "studio.saveError": { he: "שגיאה בשמירה", en: "Save error" },
  "studio.exportError": { he: "שגיאה בייצוא", en: "Export error" },
  "studio.video": { he: "וידאו", en: "Video" },
  "studio.backToTop": { he: "חזרה למעלה", en: "Back to top" },

  // Rename
  "rename.title": { he: "שנה שם פרויקט", en: "Rename project" },
  "rename.placeholder": { he: "שם חדש...", en: "New name..." },
  "rename.save": { he: "שמור", en: "Save" },
  "rename.cancel": { he: "ביטול", en: "Cancel" },

  // Time
  "time.seconds": { he: "שניות", en: "seconds" },
  "time.minutes": { he: "דקות", en: "minutes" },
  "time.hours": { he: "שעות", en: "hours" },
  "time.and": { he: "ו-", en: "and " },
  "time.secShort": { he: "שנ׳", en: "sec" },
  "time.minShort": { he: "דק׳", en: "min" },
  "time.hourShort": { he: "שע׳", en: "hr" },

  // Settings page
  "settings.title": { he: "הגדרות", en: "Settings" },
  "settings.subtitle": { he: "הגדרות מערכת ומפתחות API", en: "System settings and API keys" },
  "settings.darkMode": { he: "מצב כהה", en: "Dark mode" },
  "settings.apiKeys": { he: "מפתחות API", en: "API Keys" },
  "settings.defaults": { he: "ברירות מחדל", en: "Defaults" },
  "settings.credits": { he: "קרדיט", en: "Credits" },

  // Home page
  "home.title": { he: "סטודיו תמלול מקצועי", en: "Professional Transcription Studio" },
  "home.subtitle": { he: "תמלול אודיו ווידאו מקצועי עם תמיכה מובנית בעברית", en: "Professional audio & video transcription with built-in Hebrew support" },
  "home.quickActions": { he: "התחל עכשיו", en: "Quick Actions" },
  "home.uploadFile": { he: "העלה קובץ", en: "Upload File" },
  "home.fromUrl": { he: "מ-URL", en: "From URL" },
  "home.myProjects": { he: "הפרויקטים שלי", en: "My Projects" },

  // Transcribe page
  "transcribe.title": { he: "פרויקט חדש", en: "New Project" },
  "transcribe.subtitle": { he: "העלה קבצים, בחר תיקייה, או הדבק קישור לתמלול", en: "Upload files, select a folder, or paste a link to transcribe" },
  "transcribe.dragDrop": { he: "גרור קבצים לכאן או לחץ לבחירה", en: "Drag files here or click to select" },
  "transcribe.start": { he: "התחל תמלול", en: "Start Transcription" },

  // URL page
  "url.title": { he: "תמלול מ-YouTube / URL", en: "Transcribe from YouTube / URL" },
  "url.subtitle": { he: "הזן כתובת URL של סרטון לתמלול", en: "Enter a video URL to transcribe" },
  "url.placeholder": { he: "הדבק כתובת URL...", en: "Paste URL..." },
  "url.start": { he: "התחל תמלול", en: "Start Transcription" },

  // Speaker Diarization
  "diarize.button": { he: "זיהוי דוברים", en: "Identify Speakers" },
  "diarize.running": { he: "מזהה דוברים...", en: "Identifying speakers..." },
  "diarize.complete": { he: "זיהוי דוברים הושלם", en: "Speaker identification complete" },
  "diarize.error": { he: "שגיאה בזיהוי דוברים", en: "Speaker identification error" },
  "diarize.speakers": { he: "דוברים", en: "speakers" },
  "diarize.renameSpeaker": { he: "שנה שם דובר", en: "Rename speaker" },
  "diarize.speakerName": { he: "שם הדובר", en: "Speaker name" },
  "diarize.numSpeakers": { he: "מספר דוברים (אופציונלי)", en: "Number of speakers (optional)" },
  "diarize.numSpeakersHint": { he: "השאר ריק לזיהוי אוטומטי", en: "Leave empty for auto-detection" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key;
}

export function isRtl(lang: Lang): boolean {
  return lang === "he";
}
