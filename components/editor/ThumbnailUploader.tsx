"use client";

import { useRef } from "react";
import {
  putThumbnail,
  deleteThumbnail,
  getThumbnail,
} from "@/lib/storage/blobs";
import { useThumbnailUrl } from "@/lib/hooks/useThumbnailUrl";
import { downloadBlob } from "@/lib/storage/backup";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function ThumbnailUploader({
  thumbnailId,
  onChange,
}: {
  thumbnailId: string | undefined;
  onChange: (newId: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useThumbnailUrl(thumbnailId);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      alert(`Thumbnail must be under 10MB. Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    // Clean up old blob before saving new one
    if (thumbnailId) {
      await deleteThumbnail(thumbnailId);
    }
    const id = await putThumbnail(file);
    onChange(id);
  };

  const handleDownload = async () => {
    if (!thumbnailId) return;
    const blob = await getThumbnail(thumbnailId);
    if (!blob) return;
    const ext = blob.type.split("/")[1] ?? "jpg";
    downloadBlob(blob, `thumbnail.${ext}`);
  };

  const handleRemove = async () => {
    if (!thumbnailId) return;
    await deleteThumbnail(thumbnailId);
    onChange(undefined);
  };

  return (
    <div className="space-y-3">
      <div className="label">Thumbnail</div>
      <div
        className="relative aspect-video w-full max-w-md border border-rule bg-paper/40"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-ink");
        }}
        onDragLeave={(e) =>
          e.currentTarget.classList.remove("border-ink")
        }
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-ink");
          const file = e.dataTransfer.files[0];
          if (file) await handleFile(file);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Thumbnail" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-ash hover:text-ink"
          >
            <span className="font-display text-2xl italic">Drop image here</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]">
              or click to browse
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleFile(file);
            e.target.value = ""; // allow re-selecting same file
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost"
        >
          {thumbnailId ? "Replace" : "Upload"}
        </button>
        {thumbnailId && (
          <>
            <button type="button" onClick={handleDownload} className="btn-ghost">
              Download
            </button>
            <button type="button" onClick={handleRemove} className="btn-danger">
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
