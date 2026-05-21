"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVideoStore } from "@/lib/hooks/useVideoStore";
import { VideoForm } from "@/components/editor/VideoForm";
import { PageShell } from "@/components/ui/PageShell";
import type { Video } from "@/types/video";

export default function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { fetch } = useVideoStore();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);

  useEffect(() => {
    fetch(id).then((v) => setVideo(v ?? null));
  }, [id, fetch]);

  if (video === undefined) {
    return (
      <PageShell>
        <p className="text-ash">Loading…</p>
      </PageShell>
    );
  }

  if (video === null) {
    return (
      <PageShell title="Not found">
        <p className="text-ash">
          That video doesn&apos;t exist or was deleted.
        </p>
        <button
          onClick={() => router.push("/")}
          className="btn mt-6"
        >
          Back to dashboard
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <VideoForm initial={video} />
    </PageShell>
  );
}
