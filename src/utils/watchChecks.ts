import type { WatchCheck, WatchingItem } from "../types";
import { episodeKey } from "./tracking";

export const WATCH_CHECK_DELAY_SECONDS = 24 * 60 * 60;

export function watchCheckKey(mediaId: number | string, episode: number) {
  return `anilist:${mediaId}:${episode}`;
}

export function watchCheckEligibilityTime(airingAt: number) {
  return airingAt + WATCH_CHECK_DELAY_SECONDS;
}

export function isWatchCheckSnoozed(check: WatchCheck, now = currentUnixTime()) {
  return typeof check.snoozedUntil === "number" && check.snoozedUntil > now;
}

export function isWatchCheckDue(check: WatchCheck, now = currentUnixTime()) {
  return now >= check.eligibleAt && !isWatchCheckSnoozed(check, now);
}

export function isWatchCheckWatched(check: WatchCheck, watchedEpisodes: Record<string, boolean>) {
  return watchedEpisodes[episodeKey(check.mediaId, check.episode)] === true;
}

export function isWatchCheckActionable(
  check: WatchCheck,
  watchedEpisodes: Record<string, boolean>,
  now = currentUnixTime(),
) {
  return isWatchCheckDue(check, now) && !isWatchCheckWatched(check, watchedEpisodes);
}

export type ActionableWatchCheckGroup = {
  mediaId: number | string;
  displayTitle: string;
  checks: WatchCheck[];
};

export function getActionableWatchCheckGroups(
  checks: Record<string, WatchCheck>,
  watchedEpisodes: Record<string, boolean>,
  watchingList: Record<string, WatchingItem>,
  now = currentUnixTime(),
): ActionableWatchCheckGroup[] {
  const watchingMediaIds = new Set(Object.values(watchingList).map((item) => String(item.mediaId)));
  const groups = new Map<string, ActionableWatchCheckGroup>();

  for (const check of Object.values(checks)) {
    const mediaKey = String(check.mediaId);

    if (!watchingMediaIds.has(mediaKey) || !isWatchCheckActionable(check, watchedEpisodes, now)) {
      continue;
    }

    const existing = groups.get(mediaKey);
    if (existing) {
      existing.checks.push(check);
    } else {
      groups.set(mediaKey, {
        mediaId: check.mediaId,
        displayTitle: check.displayTitle,
        checks: [check],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      checks: [...group.checks].sort((left, right) => left.episode - right.episode),
    }))
    .sort((left, right) => {
      const leftTime = Math.min(...left.checks.map((check) => check.eligibleAt));
      const rightTime = Math.min(...right.checks.map((check) => check.eligibleAt));
      return leftTime - rightTime || left.displayTitle.localeCompare(right.displayTitle, undefined, { sensitivity: "base" });
    });
}

export function upsertWatchCheck(
  checks: Record<string, WatchCheck>,
  check: Omit<WatchCheck, "id"> | WatchCheck,
) {
  const id = watchCheckKey(check.mediaId, check.episode);
  const withoutDuplicate = Object.fromEntries(
    Object.entries(checks).filter(
      ([, existing]) =>
        Boolean(existing && typeof existing === "object") &&
        watchCheckKey(existing.mediaId, existing.episode) !== id,
    ),
  );

  return {
    ...withoutDuplicate,
    [id]: {
      ...check,
      id,
    },
  };
}

export function removeWatchChecksForMediaId(checks: Record<string, WatchCheck>, mediaId: number | string) {
  return Object.fromEntries(
    Object.entries(checks).filter(
      ([, check]) => Boolean(check && typeof check === "object") && String(check.mediaId) !== String(mediaId),
    ),
  );
}

function currentUnixTime() {
  return Math.floor(Date.now() / 1000);
}
