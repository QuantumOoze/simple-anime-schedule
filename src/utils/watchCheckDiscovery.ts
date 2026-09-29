import type { AiringItem, WatchCheck, WatchingItem } from "../types";
import { upsertWatchCheck, watchCheckEligibilityTime } from "./watchChecks";

export const WATCH_CHECK_FIRST_LOOKBACK_SECONDS = 8 * 24 * 60 * 60;
export const WATCH_CHECK_MAX_CATCH_UP_SECONDS = 30 * 24 * 60 * 60;
export const WATCH_CHECK_SCAN_OVERLAP_SECONDS = 60;

export type WatchCheckScanWindow = {
  startUnix: number;
  endUnix: number;
};

export function mergeDiscoveredWatchChecks(
  checks: Record<string, WatchCheck>,
  airingItems: AiringItem[],
  watchingList: Record<string, WatchingItem>,
  nowUnix: number,
) {
  const watchingTitles = new Map(
    Object.values(watchingList).flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const mediaId = toAniListMediaId(item.mediaId);
      return mediaId === null ? [] : [[mediaId, item.displayTitle] as const];
    }),
  );
  const watchingMediaIds = new Set(watchingTitles.keys());
  let nextChecks = pruneWatchChecksToWatchingList(checks, watchingList);

  for (const item of airingItems) {
    if (item.airingAt > nowUnix || !watchingMediaIds.has(item.animeId)) {
      continue;
    }

    nextChecks = upsertWatchCheck(nextChecks, {
      provider: "anilist",
      mediaId: item.animeId,
      displayTitle: watchingTitles.get(item.animeId) ?? item.title,
      episode: item.episode,
      airingAt: item.airingAt,
      eligibleAt: watchCheckEligibilityTime(item.airingAt),
    });
  }

  return nextChecks;
}

export function pruneWatchChecksToWatchingList(
  checks: Record<string, WatchCheck>,
  watchingList: Record<string, WatchingItem>,
) {
  const watchingMediaIds = new Set(
    Object.values(watchingList).flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const mediaId = toAniListMediaId(item.mediaId);
      return mediaId === null ? [] : [mediaId];
    }),
  );

  return Object.fromEntries(
    Object.entries(checks).filter(([, check]) => {
      if (!check || typeof check !== "object") {
        return false;
      }

      const mediaId = toAniListMediaId(check.mediaId);
      return mediaId !== null && watchingMediaIds.has(mediaId);
    }),
  );
}

export function getWatchCheckScanWindow(nowUnix: number, lastSuccessfulScanAt?: number): WatchCheckScanWindow {
  const endUnix = Math.max(0, Math.floor(nowUnix));
  const desiredStart =
    typeof lastSuccessfulScanAt === "number" && Number.isFinite(lastSuccessfulScanAt)
      ? lastSuccessfulScanAt - WATCH_CHECK_SCAN_OVERLAP_SECONDS
      : endUnix - WATCH_CHECK_FIRST_LOOKBACK_SECONDS;
  const oldestAllowedStart = endUnix - WATCH_CHECK_MAX_CATCH_UP_SECONDS;
  const startUnix = Math.min(endUnix, Math.max(0, Math.max(desiredStart, oldestAllowedStart)));

  return {
    startUnix,
    endUnix,
  };
}

function toAniListMediaId(value: number | string) {
  const mediaId = typeof value === "number" ? value : Number(value);
  return Number.isInteger(mediaId) && mediaId > 0 ? mediaId : null;
}
