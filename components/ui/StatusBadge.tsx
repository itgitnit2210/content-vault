import type { VideoStatus } from "@/types/video";

const STATUS_STYLES: Record<VideoStatus, string> = {
  idea: "bg-paper border-rule text-ash",
  drafting: "bg-paper border-ink text-ink",
  ready: "bg-accentSoft border-accent text-accent",
  recorded: "bg-paper border-ink text-ink",
  edited: "bg-paper border-ink text-ink",
  scheduled: "bg-ink border-ink text-paper",
  published: "bg-ink border-ink text-paper",
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
