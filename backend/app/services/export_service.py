"""
Kol (קול) - Export Service
Generates SRT, VTT, ASS, TXT, and JSON from transcript segments.
All formats support RTL Hebrew text.
"""

import json
from dataclasses import dataclass
from typing import Protocol

from app.models import Segment


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT timestamp: HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_vtt_time(seconds: float) -> str:
    """Format seconds to VTT timestamp: HH:MM:SS.mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def format_ass_time(seconds: float) -> str:
    """Format seconds to ASS timestamp: H:MM:SS.cc"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def export_srt(segments: list[Segment]) -> str:
    """Export to SubRip (SRT) format — the most universal subtitle format."""
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{format_srt_time(seg.start_time)} --> {format_srt_time(seg.end_time)}")
        lines.append(seg.text)
        lines.append("")  # Empty line separator
    return "\n".join(lines)


def export_vtt(segments: list[Segment]) -> str:
    """Export to WebVTT format — used in HTML5 video and YouTube."""
    lines = ["WEBVTT", ""]
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{format_vtt_time(seg.start_time)} --> {format_vtt_time(seg.end_time)}")
        lines.append(seg.text)
        lines.append("")
    return "\n".join(lines)


def export_ass(segments: list[Segment], title: str = "Kol Transcription") -> str:
    """
    Export to Advanced SubStation Alpha (ASS) format.
    Includes RTL direction override for Hebrew text.
    Used in professional video editing (Aegisub, DaVinci Resolve, etc.)
    """
    header = f"""[Script Info]
Title: {title}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,30,30,40,0
Style: Hebrew,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,30,30,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header.strip()]

    for seg in segments:
        start = format_ass_time(seg.start_time)
        end = format_ass_time(seg.end_time)
        # Use Unicode RTL override for Hebrew
        text = f"{{\\an2}}\\N{seg.text}"
        lines.append(f"Dialogue: 0,{start},{end},Hebrew,,0,0,0,,{text}")

    return "\n".join(lines)


def export_txt(segments: list[Segment]) -> str:
    """Export to plain text — clean text only, no timestamps."""
    lines = []
    for seg in segments:
        lines.append(seg.text)
    return "\n".join(lines)


def export_json(segments: list[Segment]) -> str:
    """Export to JSON — full data including word-level timestamps."""
    data = {
        "segments": [
            {
                "index": seg.index_num,
                "start": seg.start_time,
                "end": seg.end_time,
                "text": seg.text,
                "speaker": seg.speaker,
                "confidence": seg.confidence,
                "words": [
                    {
                        "word": w.word,
                        "start": w.start_time,
                        "end": w.end_time,
                        "confidence": w.confidence,
                    }
                    for w in (seg.words or [])
                ],
            }
            for seg in segments
        ]
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


# Registry of all exporters
EXPORTERS = {
    "srt": ("SubRip (.srt)", export_srt, "srt"),
    "vtt": ("WebVTT (.vtt)", export_vtt, "vtt"),
    "ass": ("Advanced SSA (.ass)", export_ass, "ass"),
    "txt": ("Plain Text (.txt)", export_txt, "txt"),
    "json": ("JSON (.json)", export_json, "json"),
}


def get_available_formats() -> list[dict]:
    """List available export formats."""
    return [
        {"id": key, "name": name, "extension": ext}
        for key, (name, _, ext) in EXPORTERS.items()
    ]


def export_transcript(segments: list[Segment], fmt: str, **kwargs) -> tuple[str, str]:
    """
    Export transcript in the specified format.
    Returns (content, filename_extension).
    """
    if fmt not in EXPORTERS:
        raise ValueError(f"Unknown format: {fmt}. Available: {list(EXPORTERS.keys())}")

    name, exporter, ext = EXPORTERS[fmt]
    content = exporter(segments, **kwargs) if kwargs else exporter(segments)
    return content, ext
