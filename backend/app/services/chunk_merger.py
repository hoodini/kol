"""
Blitz AI - Chunk Merger
Merges transcription results from overlapping chunks into a seamless transcript.
"""

import logging

from app.engines.base import ChunkResult, TranscribedSegment, TranscribedWord

logger = logging.getLogger(__name__)


def merge_chunk_results(
    chunks: list[ChunkResult],
    chunk_offsets: list[float],
    overlap_duration: float = 2.0,
) -> ChunkResult:
    """
    Merge multiple chunk results into a single continuous transcript.

    Strategy for overlap zones:
    1. Offset all timestamps by the chunk's start position
    2. In overlap zones, keep the segment with higher confidence
    3. Deduplicate words that appear in both chunks' overlap regions

    Args:
        chunks: List of ChunkResult from each chunk
        chunk_offsets: Start time (seconds) of each chunk in the original audio
        overlap_duration: Duration of overlap between chunks
    """
    if not chunks:
        return ChunkResult(segments=[], language="he")

    if len(chunks) == 1:
        return chunks[0]

    all_segments: list[TranscribedSegment] = []

    for chunk_idx, (chunk, offset) in enumerate(zip(chunks, chunk_offsets)):
        for seg in chunk.segments:
            # Offset timestamps to absolute position
            adjusted_seg = TranscribedSegment(
                start=seg.start + offset,
                end=seg.end + offset,
                text=seg.text,
                words=[
                    TranscribedWord(
                        word=w.word,
                        start=w.start + offset,
                        end=w.end + offset,
                        confidence=w.confidence,
                    )
                    for w in seg.words
                ],
                confidence=seg.confidence,
                speaker=seg.speaker,
            )

            # For chunks after the first, skip segments that fall entirely
            # in the overlap zone (they were already captured by the previous chunk)
            if chunk_idx > 0:
                overlap_start = offset
                overlap_end = offset + overlap_duration
                if adjusted_seg.end <= overlap_end:
                    # This segment is entirely in the overlap zone — skip it
                    continue
                elif adjusted_seg.start < overlap_end:
                    # Segment partially in overlap — trim the beginning
                    adjusted_seg.start = overlap_end

            all_segments.append(adjusted_seg)

    # Sort by start time and re-index
    all_segments.sort(key=lambda s: s.start)

    # Remove near-duplicate segments (same text within 1 second)
    deduped = []
    for seg in all_segments:
        if deduped:
            prev = deduped[-1]
            # Check for near-duplicate
            if (abs(seg.start - prev.start) < 1.0 and
                    _text_similarity(seg.text, prev.text) > 0.7):
                # Keep the one with higher confidence
                if seg.confidence > prev.confidence:
                    deduped[-1] = seg
                continue
        deduped.append(seg)

    return ChunkResult(
        segments=deduped,
        language=chunks[0].language,
        duration=deduped[-1].end if deduped else 0,
    )


def _text_similarity(a: str, b: str) -> float:
    """Simple word-overlap similarity ratio."""
    words_a = set(a.split())
    words_b = set(b.split())
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)
