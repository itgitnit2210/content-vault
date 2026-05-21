"use client";

import { useEffect, useState } from "react";
import { getThumbnailUrl } from "@/lib/storage/blobs";

export function useThumbnailUrl(thumbnailId: string | undefined) {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let createdUrl: string | undefined;

    if (!thumbnailId) {
      setUrl(undefined);
      return;
    }

    getThumbnailUrl(thumbnailId).then((u) => {
      if (!active) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      createdUrl = u;
      setUrl(u);
    });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [thumbnailId]);

  return url;
}
