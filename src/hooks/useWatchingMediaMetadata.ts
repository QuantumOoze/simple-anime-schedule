import { useEffect, useMemo, useState } from "react";
import { fetchMediaAiringMetadata } from "../api/anilist";
import type { MediaAiringMetadata, WatchingItem } from "../types";

const METADATA_DEBOUNCE_MS = 750;

export function useWatchingMediaMetadata(watchingItems: WatchingItem[]) {
  const [metadata, setMetadata] = useState<Record<string, MediaAiringMetadata>>({});
  const mediaIds = useMemo(
    () => Array.from(new Set(watchingItems.map((item) => Number(item.mediaId)).filter((mediaId) => Number.isInteger(mediaId) && mediaId > 0))),
    [watchingItems],
  );
  const mediaSignature = mediaIds.join(",");

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      if (mediaIds.length === 0) {
        setMetadata({});
        return;
      }

      try {
        const nextMetadata = await fetchMediaAiringMetadata(mediaIds, controller.signal);
        if (!controller.signal.aborted) {
          setMetadata(nextMetadata);
        }
      } catch {
        if (!controller.signal.aborted) {
          setMetadata({});
        }
      }
    }, METADATA_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [mediaIds, mediaSignature]);

  return metadata;
}
