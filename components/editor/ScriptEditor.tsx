"use client";

import { useState } from "react";
import { HighlightableTextarea, type Highlight } from "./HighlightableTextarea";

const COMMON_LANGUAGES = ["english", "hindi", "hinglish", "telugu", "spanish"];

export function ScriptEditor({
  scripts,
  highlights,
  onChange,
  onHighlightsChange,
}: {
  scripts: Record<string, string>;
  highlights: Record<string, Highlight[]>;
  onChange: (next: Record<string, string>) => void;
  onHighlightsChange: (next: Record<string, Highlight[]>) => void;
}) {
  const keys = Object.keys(scripts);
  const [active, setActive] = useState(keys[0] ?? "english");
  const [adding, setAdding] = useState(false);
  const [newLang, setNewLang] = useState("");

  const addLanguage = (lang: string) => {
    const clean = lang.trim().toLowerCase();
    if (!clean) return;
    if (scripts[clean] !== undefined) {
      setActive(clean);
      setAdding(false);
      setNewLang("");
      return;
    }
    onChange({ ...scripts, [clean]: "" });
    setActive(clean);
    setAdding(false);
    setNewLang("");
  };

  const removeLanguage = (lang: string) => {
    if (keys.length <= 1) {
      alert("Need at least one script language.");
      return;
    }
    const { [lang]: _, ...rest } = scripts;
    onChange(rest);
    // Also drop highlights for that language
    if (highlights[lang]) {
      const { [lang]: __, ...restHl } = highlights;
      onHighlightsChange(restHl);
    }
    setActive(Object.keys(rest)[0]);
  };

  const activeHighlights = highlights[active] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="label">Scripts</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-rule">
        {keys.map((k) => {
          const count = highlights[k]?.length ?? 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={`group relative px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                active === k
                  ? "border-b-2 border-ink text-ink"
                  : "text-ash hover:text-ink"
              }`}
            >
              {k}
              {count > 0 && (
                <span className="ml-1 text-ink">({count})</span>
              )}
              {keys.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLanguage(k);
                  }}
                  className="ml-2 inline-block opacity-0 transition group-hover:opacity-60 hover:opacity-100"
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}
        {adding ? (
          <span className="flex items-center gap-1 px-2">
            <input
              autoFocus
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLanguage(newLang);
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="language"
              className="border-b border-ink bg-transparent py-1 font-mono text-xs lowercase focus:outline-none w-24"
              list="lang-suggestions"
            />
            <datalist id="lang-suggestions">
              {COMMON_LANGUAGES.filter((l) => !keys.includes(l)).map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => addLanguage(newLang)}
              className="font-mono text-[10px] text-ink"
            >
              add
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ash hover:text-ink"
          >
            + add language
          </button>
        )}
      </div>

      <HighlightableTextarea
        value={scripts[active] ?? ""}
        onChange={(v) => onChange({ ...scripts, [active]: v })}
        highlights={activeHighlights}
        onHighlightsChange={(hls) =>
          onHighlightsChange({ ...highlights, [active]: hls })
        }
        rows={14}
        placeholder={`Write your ${active} script here…`}
      />

      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ash">
        {(scripts[active] ?? "").length.toLocaleString()} chars ·{" "}
        {(scripts[active] ?? "").split(/\s+/).filter(Boolean).length} words
        {activeHighlights.length > 0 && (
          <span> · {activeHighlights.length} highlight{activeHighlights.length === 1 ? "" : "s"}</span>
        )}
      </div>
    </div>
  );
}
