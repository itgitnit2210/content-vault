"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type HighlightColor = "yellow" | "green";

export interface Highlight {
  /** Start character offset in the text */
  start: number;
  /** End character offset (exclusive) in the text */
  end: number;
  /** The actual highlighted text — used to re-locate after edits */
  text: string;
  /** Color — defaults to yellow for backward compatibility */
  color?: HighlightColor;
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

const COLOR_CLASS: Record<HighlightColor, string> = {
  yellow: "bg-highlight",
  green: "bg-highlightGreen",
};

/**
 * Textarea that supports persistent text highlights in multiple colors.
 * Highlights are rendered via an absolutely-positioned mirror div behind the textarea.
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

  const syncScroll = useCallback(() => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    syncScroll();
  }, [value, highlights, syncScroll]);

  const relocateHighlights = useCallback(
    (newText: string): Highlight[] => {
      return highlights
        .map((h) => {
          if (newText.slice(h.start, h.end) === h.text) {
            return h;
          }
          const searchStart = Math.max(0, h.start - 100);
          const searchEnd = Math.min(newText.length, h.start + h.text.length + 100);
          const window = newText.slice(searchStart, searchEnd);
          const localIdx = window.indexOf(h.text);
          if (localIdx >= 0) {
            const newStart = searchStart + localIdx;
            return { ...h, start: newStart, end: newStart + h.text.length };
          }
          const globalIdx = newText.indexOf(h.text);
          if (globalIdx >= 0) {
            return { ...h, start: globalIdx, end: globalIdx + h.text.length };
          }
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

  /** Add a highlight from current selection in the given color */
  const handleHighlight = (color: HighlightColor) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const text = value.slice(start, end);
    if (!text.trim()) return;

    // If the selection exactly matches an existing highlight, replace its color.
    // Otherwise, remove any overlapping highlights first, then add the new one.
    // This means selecting a yellow highlight and clicking green converts it.
    const overlap = highlights.filter(
      (h) => !(h.end <= start || h.start >= end)
    );
    const nonOverlap = highlights.filter(
      (h) => h.end <= start || h.start >= end
    );

    // If selection fully contains all overlapping highlights, treat as recolor:
    // span the full selection. Otherwise, merge so the union is highlighted.
    let newStart = start;
    let newEnd = end;
    for (const h of overlap) {
      newStart = Math.min(newStart, h.start);
      newEnd = Math.max(newEnd, h.end);
    }
    const newHl: Highlight = {
      start: newStart,
      end: newEnd,
      text: value.slice(newStart, newEnd),
      color,
    };

    // Merge with adjacent highlights of the SAME color only
    const merged: Highlight[] = [];
    const candidates = [...nonOverlap, newHl].sort((a, b) => a.start - b.start);
    for (const h of candidates) {
      const last = merged[merged.length - 1];
      if (
        last &&
        h.start <= last.end &&
        (last.color ?? "yellow") === (h.color ?? "yellow")
      ) {
        last.end = Math.max(last.end, h.end);
        last.text = value.slice(last.start, last.end);
      } else {
        merged.push({ ...h });
      }
    }

    onHighlightsChange(merged);
    ta.focus();
  };

  /** Remove highlights at cursor or overlapping selection */
  const handleUnhighlight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;

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

    const next = highlights.filter(
      (h) => h.end <= selStart || h.start >= selEnd
    );
    onHighlightsChange(next);
    ta.focus();
  };

  const renderedSegments = buildSegments(value, highlights);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleHighlight("yellow")}
          disabled={!hasSelection}
          className="border border-rule bg-highlight/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule"
          title="Highlight selected text yellow"
        >
          ▮ Yellow
        </button>
        <button
          type="button"
          onClick={() => handleHighlight("green")}
          disabled={!hasSelection}
          className="border border-rule bg-highlightGreen/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule"
          title="Highlight selected text green"
        >
          ▮ Green
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
          Select text, pick a color
        </span>
      </div>

      <div className="relative">
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent p-3 font-body text-base leading-relaxed text-transparent"
          style={{ wordBreak: "break-word" }}
        >
          {renderedSegments.map((seg, i) =>
            seg.highlighted ? (
              <mark
                key={i}
                className={`${COLOR_CLASS[seg.color ?? "yellow"]} text-transparent`}
                style={{ borderRadius: 0 }}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
          {"\n"}
        </div>

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
          style={{ wordBreak: "break-word" }}
        />
      </div>
    </div>
  );
}

interface Segment {
  text: string;
  highlighted: boolean;
  color?: HighlightColor;
}

function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  if (highlights.length === 0) {
    return [{ text, highlighted: false }];
  }

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
      color: h.color ?? "yellow",
    });
    cursor = h.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlighted: false });
  }

  return segments;
}
