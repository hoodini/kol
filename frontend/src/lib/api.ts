/**
 * Blitz AI - API Client
 * Centralized API communication with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail);
    throw new Error(detail || `API Error: ${res.status}`);
  }

  return res.json();
}

// ─── Projects ────────────────────────────────────

export const api = {
  // Projects
  listProjects: (params?: { search?: string; status?: string; tag?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ projects: Project[]; total: number }>(`/api/projects${qs ? `?${qs}` : ""}`);
  },

  getProject: (id: string) => request<Project>(`/api/projects/${id}`),

  deleteProject: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),

  updateProject: (id: string, data: { name?: string; tags?: string[] }) =>
    request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Transcription
  getEngines: () => request<Engine[]>("/api/transcribe/engines"),

  uploadFile: async (file: File, engine: string, language: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("engine", engine);
    formData.append("language", language);
    const res = await fetch(`${API_BASE}/api/transcribe/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  uploadMultiple: async (files: File[], engine: string, language: string) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("engine", engine);
    formData.append("language", language);
    const res = await fetch(`${API_BASE}/api/transcribe/upload-multiple`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  transcribeUrl: (url: string, engine: string, language: string, playlist: boolean = false) =>
    request("/api/transcribe/url", {
      method: "POST",
      body: JSON.stringify({ url, engine, language, playlist }),
    }),

  getUrlInfo: (url: string) =>
    request("/api/transcribe/url/info", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  transcribeFolder: (folderPath: string, engine: string, language: string) =>
    request("/api/transcribe/folder", {
      method: "POST",
      body: JSON.stringify({ folder_path: folderPath, engine, language }),
    }),

  // Studio
  getStudioData: (projectId: string, version?: number) => {
    const qs = version ? `?version=${version}` : "";
    return request<StudioData>(`/api/studio/${projectId}${qs}`);
  },

  saveStudioEdits: (projectId: string, segments: SegmentUpdate[]) =>
    request(`/api/studio/${projectId}`, {
      method: "PUT",
      body: JSON.stringify({ segments }),
    }),

  getAudioUrl: (projectId: string) => `${API_BASE}/api/studio/${projectId}/audio`,
  getVideoUrl: (projectId: string) => `${API_BASE}/api/studio/${projectId}/video`,

  getVersions: (projectId: string) =>
    request<{ version_number: number; created_at: string }[]>(`/api/studio/${projectId}/versions`),

  // Export
  getFormats: () => request<ExportFormat[]>("/api/export/formats"),

  exportProject: async (projectId: string, format: string, version?: number) => {
    const res = await fetch(`${API_BASE}/api/export/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, version }),
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    return blob;
  },

  // Speaker Diarization
  diarizeProject: (projectId: string, numSpeakers?: number) =>
    request<DiarizeResponse>(`/api/studio/${projectId}/diarize`, {
      method: "POST",
      body: JSON.stringify({ num_speakers: numSpeakers ?? null }),
    }),

  getSpeakers: (projectId: string) =>
    request<SpeakersResponse>(`/api/studio/${projectId}/speakers`),

  renameSpeaker: (projectId: string, oldName: string, newName: string) =>
    request<RenameSpeakerResponse>(`/api/studio/${projectId}/rename-speaker`, {
      method: "POST",
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    }),

  mergeSpeakers: (projectId: string, sourceSpeaker: string, targetSpeaker: string) =>
    request<RenameSpeakerResponse>(`/api/studio/${projectId}/merge-speakers`, {
      method: "POST",
      body: JSON.stringify({ source_speaker: sourceSpeaker, target_speaker: targetSpeaker }),
    }),

  clearSpeakers: (projectId: string) =>
    request<{ status: string; version_number: number }>(`/api/studio/${projectId}/clear-speakers`, {
      method: "POST",
    }),

  deleteSpeakerSegments: (projectId: string, speaker: string) =>
    request<{ status: string; version_number: number; speakers: string[]; deleted_count: number }>(
      `/api/studio/${projectId}/delete-speaker-segments`,
      { method: "POST", body: JSON.stringify({ speaker }) },
    ),

  // Settings
  getSettings: () => request<Settings>("/api/settings"),

  // WebSocket
  createWebSocket: (projectId: string) => {
    const wsBase = API_BASE.replace("http", "ws");
    return new WebSocket(`${wsBase}/api/ws/${projectId}`);
  },
};

// ─── Types ───────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  source_filename: string;
  source_url?: string;
  source_type: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  language: string;
  engine_used?: string;
  status: string;
  progress: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  has_video: boolean;
  tags: string[];
  version_count: number;
}

export interface Engine {
  id: string;
  name: string;
  available: boolean;
  requires_api_key: boolean;
}

export interface Segment {
  id: string;
  index_num: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
  confidence?: number;
  words: Word[];
}

export interface Word {
  id: string;
  word: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

export interface SegmentUpdate {
  id: string;
  text: string;
  start_time?: number;
  end_time?: number;
  speaker?: string;
}

export interface StudioData {
  project: Project;
  segments: Segment[];
  version_number: number;
  total_versions: number;
}

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
}

export interface DiarizeResponse {
  status: string;
  version_number: number;
  speakers: string[];
  segment_count: number;
}

export interface SpeakersResponse {
  speakers: string[];
  has_diarization: boolean;
}

export interface RenameSpeakerResponse {
  status: string;
  version_number: number;
  speakers: string[];
}

export interface Settings {
  default_engine: string;
  default_language: string;
  whisper_model: string;
  groq_api_key_set: boolean;
  gemini_api_key_set: boolean;
  huggingface_api_key_set: boolean;
}
