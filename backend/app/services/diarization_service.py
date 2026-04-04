"""
Blitz AI - Speaker Diarization Service
Identifies distinct speakers in audio and assigns speaker labels to transcript segments.

Uses pyannote-audio for local diarization (requires HuggingFace token).
Falls back to a simple energy-based heuristic if pyannote is not available.
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-loaded pyannote pipeline
_pipeline = None
_pyannote_available: Optional[bool] = None


def is_pyannote_available() -> bool:
    """Check if pyannote-audio is installed and usable."""
    global _pyannote_available
    if _pyannote_available is None:
        try:
            import pyannote.audio  # noqa: F401
            _pyannote_available = True
        except ImportError:
            _pyannote_available = False
            logger.warning("pyannote-audio not installed. Speaker diarization will use simple heuristic.")
    return _pyannote_available


def _get_pipeline(hf_token: str):
    """Lazy-load the pyannote speaker diarization pipeline."""
    global _pipeline
    if _pipeline is None:
        from pyannote.audio import Pipeline
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token,
        )
        logger.info("Pyannote diarization pipeline loaded.")
    return _pipeline


def _diarize_with_pyannote(
    audio_path: str,
    hf_token: str,
    num_speakers: Optional[int] = None,
) -> list[dict]:
    """
    Run pyannote speaker diarization on the full audio file.
    Returns a list of speaker turns: [{"start": float, "end": float, "speaker": str}, ...]
    """
    pipeline = _get_pipeline(hf_token)

    diarization_params = {}
    if num_speakers is not None:
        diarization_params["num_speakers"] = num_speakers

    diarization = pipeline(audio_path, **diarization_params)

    turns = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        turns.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker,
        })

    logger.info(f"Pyannote diarization found {len(set(t['speaker'] for t in turns))} speakers in {len(turns)} turns.")
    return turns


def _diarize_simple_heuristic(segments: list[dict]) -> list[dict]:
    """
    Simple heuristic fallback: alternate speakers based on pauses between segments.
    If there's a pause > 1.5 seconds between segments, consider it a speaker change.
    This is a very rough heuristic — pyannote is strongly preferred.
    """
    if not segments:
        return []

    PAUSE_THRESHOLD = 1.5  # seconds
    turns = []
    current_speaker = "SPEAKER_00"
    speaker_toggle = {"SPEAKER_00": "SPEAKER_01", "SPEAKER_01": "SPEAKER_00"}

    for i, seg in enumerate(segments):
        if i > 0:
            pause = seg["start_time"] - segments[i - 1]["end_time"]
            if pause > PAUSE_THRESHOLD:
                current_speaker = speaker_toggle.get(current_speaker, "SPEAKER_00")

        turns.append({
            "start": seg["start_time"],
            "end": seg["end_time"],
            "speaker": current_speaker,
        })

    return turns


def assign_speakers_to_segments(
    segments: list[dict],
    turns: list[dict],
) -> list[dict]:
    """
    Match diarization speaker turns to transcript segments using overlap.
    Each segment gets the speaker label that covers the most of its duration.
    """
    for seg in segments:
        seg_start = seg["start_time"]
        seg_end = seg["end_time"]
        seg_duration = seg_end - seg_start

        if seg_duration <= 0:
            continue

        # Find overlapping turns and their coverage
        speaker_coverage: dict[str, float] = {}
        for turn in turns:
            overlap_start = max(seg_start, turn["start"])
            overlap_end = min(seg_end, turn["end"])
            overlap = max(0, overlap_end - overlap_start)
            if overlap > 0:
                speaker_coverage[turn["speaker"]] = speaker_coverage.get(turn["speaker"], 0) + overlap

        if speaker_coverage:
            # Assign the speaker with the most overlap
            seg["speaker"] = max(speaker_coverage, key=speaker_coverage.get)

    return segments


def run_diarization(
    audio_path: str,
    segments: list[dict],
    hf_token: str = "",
    num_speakers: Optional[int] = None,
) -> tuple[list[dict], list[str]]:
    """
    Main entry point: run speaker diarization and assign labels to segments.

    Args:
        audio_path: Path to the WAV audio file.
        segments: List of segment dicts with start_time, end_time, text.
        hf_token: HuggingFace API token (required for pyannote).
        num_speakers: Optional hint for number of speakers.

    Returns:
        Tuple of (updated_segments, unique_speaker_labels)
    """
    if is_pyannote_available() and hf_token:
        logger.info("Running pyannote speaker diarization...")
        turns = _diarize_with_pyannote(audio_path, hf_token, num_speakers)
    else:
        if not hf_token:
            logger.info("No HuggingFace token provided — using simple heuristic diarization.")
        logger.info("Running simple heuristic diarization...")
        turns = _diarize_simple_heuristic(segments)

    # Assign speakers to segments
    updated_segments = assign_speakers_to_segments(segments, turns)

    # Collect unique speakers and create readable labels
    raw_speakers = sorted(set(s.get("speaker", "") for s in updated_segments if s.get("speaker")))

    # Map raw pyannote labels (e.g., SPEAKER_00) to readable labels (דובר 1)
    speaker_map = {}
    for i, raw in enumerate(raw_speakers):
        speaker_map[raw] = f"דובר {i + 1}"

    # Apply readable labels
    for seg in updated_segments:
        if seg.get("speaker") in speaker_map:
            seg["speaker"] = speaker_map[seg["speaker"]]

    unique_speakers = list(speaker_map.values())
    logger.info(f"Diarization complete. Speakers: {unique_speakers}")

    return updated_segments, unique_speakers
