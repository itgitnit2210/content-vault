"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Highlight {
  /** Start character offset in the text */
  start: number;
  /** End character offset (exclusive) in the text */
  end: number;
  /** The actual highlighted text — used to re-locate after edits */
  text: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  highlights: Highlight[];
  onHighlightsChange: (next: Highlight[]) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Textarea that supports persistent text highlights.
 * Highlights are rendered via an absolutely-positioned mirror div behind the textarea.
 * The textarea text is transparent; the mirror shows the actual visible text + highlight spans.
 */
export function HighlightableTextarea({
  value,
  onChange,
  highlights,
  onHighlightsChange,
  rows = 14,
  placeholder,
  className = "",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [hasSelection, setHasSelection] = useState(false);

  /** Sync scroll position between textarea and mirror */
  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    syncScroll();
  }, [value, highlights, syncScroll]);

  /** Re-locate highlights after text changes */
  const relocateHighlights = useCallback(
    (newText: string): Highlight[] => {
      return highlights
        .map((h) => {
          // First, check if the highlight is still in the same place
          if (newText.slice(h.start, h.end) === h.text) {
            return h;
          }
          // Otherwise, search for the text near the original position
          // Look within a reasonable window around the old start position
          const searchStart = Math.max(0, h.start - 100);
          const searchEnd = Math.min(newText.length, h.start + h.text.length + 100);
          const window = newText.slice(searchStart, searchEnd);
          const localIdx = window.indexOf(h.text);
          if (localIdx >= 0) {
            const newStart = searchStart + localIdx;
            return { ...h, start: newStart, end: newStart + h.text.length };
          }
          // Try one more time searching the whole string
          const globalIdx = newText.indexOf(h.text);
          if (globalIdx >= 0) {
            return { ...h, start: globalIdx, end: globalIdx + h.text.length };
          }
          // Couldn't find it — drop the highlight
          return null;
        })
        .filter((h): h is Highlight => h !== null);
    },
    [highlights]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const relocated = relocateHighlights(newText);
    onChange(newText);
    if (relocated.length !== highlights.length) {
      onHighlightsChange(relocated);
    } else if (relocated.some((h, i) => h.start !== highlights[i].start)) {
      onHighlightsChange(relocated);
    }
  };

  const updateSelectionState = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    setHasSelection(ta.selectionStart !== ta.selectionEnd);
  };

  /** Add a highlight from current selection */
  const handleHighlight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const text = value.slice(start, end);
    if (!text.trim()) return;

    // Merge overlapping highlights, recomputing text from source for merged ranges
    const all = [...highlights, { start, end, text }].sort(
      (a, b) => a.start - b.start
    );
    const merged: Highlight[] = [];
    for (const h of all) {
      const last = merged[merged.length - 1];
      if (last && h.start <= last.end) {
        last.end = Math.max(last.end, h.end);
        last.text = value.slice(last.start, last.end);
      } else {
        merged.push({ ...h });
      }
    }
    onHighlightsChange(merged);

    // Re-focus to keep editing flow smooth
    ta.focus();
  };

  /** Remove highlights that overlap with current selection */
  const handleUnhighlight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;

    // If nothing selected, find the highlight at cursor position and remove it
    if (selStart === selEnd) {
      const next = highlights.filter(
        (h) => !(selStart >= h.start && selStart <= h.end)
      );
      if (next.length !== highlights.length) {
        onHighlightsChange(next);
      }
      ta.focus();
      return;
    }

    // Otherwise, remove any highlight that overlaps the selection
    const next = highlights.filter(
      (h) => h.end <= selStart || h.start >= selEnd
    );
    onHighlightsChange(next);
    ta.focus();
  };

  /** Render text with highlight spans for the mirror */
  const renderedSegments = buildSegments(value, highlights);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleHighlight}
          disabled={!hasSelection}
          className="border border-rule bg-highlight/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule"
          title="Highlight selected text"
        >
          ▮ Highlight
        </button>
        <button
          type="button"
          onClick={handleUnhighlight}
          disabled={highlights.length === 0}
          className="border border-rule bg-transparent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-ash"
          title="Remove highlight at cursor or selection"
        >
          ▯ Unhighlight
        </button>
        {highlights.length > 0 && (
          <button
            type="button"
            onClick={() => onHighlightsChange([])}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash transition hover:text-accent"
          >
            Clear all ({highlights.length})
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
          Select text, then click highlight
        </span>
      </div>

      <div className="relative">
        {/* Mirror div — shows highlighted version under the textarea */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent p-3 font-body text-base leading-relaxed text-transparent"
          style={{
            // Match textarea typography exactly
            wordBreak: "break-word",
          }}
        >
          {renderedSegments.map((seg, i) =>
            seg.highlighted ? (
              <mark
                key={i}
                className="bg-highlight text-transparent"
                style={{ borderRadius: 0 }}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
          {/* Trailing newline space so the last line gets measured */}
          {"\n"}
        </div>

        {/* The real textarea — text is visible, background is transparent so mirror shows through */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={syncScroll}
          onSelect={updateSelectionState}
          onKeyUp={updateSelectionState}
          onMouseUp={updateSelectionState}
          rows={rows}
          placeholder={placeholder}
          className="relative w-full border border-rule bg-transparent p-3 font-body text-base leading-relaxed text-ink placeholder:text-ash/50 focus:border-ink focus:outline-none"
          style={{
            wordBreak: "break-word",
          }}
        />
      </div>
    </div>
  );
}

interface Segment {
  text: string;
  highlighted: boolean;
}

/** Split text into highlighted/non-highlighted segments for rendering */
function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  if (highlights.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort highlights by start position; assume non-overlapping (mergeHighlight enforces this)
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const h of sorted) {
    if (h.start > cursor) {
      segments.push({ text: text.slice(cursor, h.start), highlighted: false });
    }
    segments.push({
      text: text.slice(h.start, h.end),
      highlighted: true,
    });
    cursor = h.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlighted: false });
  }

  return segments;
}
