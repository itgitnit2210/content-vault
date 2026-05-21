"use client";

import { useState } from "react";

export function TagsInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const cleaned = raw.trim().toLowerCase().replace(/^#/, "");
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setDraft("");
      return;
    }
    onChange([...tags, cleaned]);
    setDraft("");
  };

  const remove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule py-2">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 border border-rule bg-paper/60 px-2 py-0.5 font-mono text-xs lowercase"
        >
          #{t}
          <button
            type="button"
            onClick={() => remove(t)}
            className="text-ash hover:text-accent"
            aria-label={`Remove ${t}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (
            e.key === "Backspace" &&
            !draft &&
            tags.length > 0
          ) {
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={placeholder ?? "Add tag, press Enter"}
        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm placeholder:text-ash/50 focus:outline-none"
      />
    </div>
  );
}
