import { useEffect, useMemo, useRef } from "react";
import { fetchAiringSchedulesForMediaIds } from "../api/anilist";
import type { UserTrackingState, WatchingItem } from "../types";
import { getWatchCheckScanWindow, mergeDiscoveredWatchChecks } from "../utils/watchCheckDiscovery";

const WATCH_CHECK_DISCOVERY_DEBOUNCE_MS = 750;

type UseWatchCheckDiscoveryOptions = {
  watchingList: Record<string, WatchingItem>;
  lastSuccessfulScanAt?: number;
  initializedMediaIds: Record<string, boolean>;
  setTrackingState: React.Dispatch<React.SetStateAction<UserTrackingState>>;
};

export function useWatchCheckDiscovery({
  watchingList,
  lastSuccessfulScanAt,
  initializedMediaIds,
  setTrackingState,
}: UseWatchCheckDiscoveryOptions) {
  const completedMembershipScan = useRef<string | null>(null);
  const discoveryGeneration = useRef(0);
  const watchingItems = useMemo(() => Object.values(watchingList), [watchingList]);
  const watchingSignature = useMemo(
    () =>
      Array.from(new Set(watchingItems.map((item) => toAniListMediaId(item.mediaId)).filter(isNumber)))
        .sort((left, right) => left - right)
        .join(","),
    [watchingItems],
  );
  const initializedMediaSignature = useMemo(
    () =>
      Object.entries(initializedMediaIds)
        .filter(([, initialized]) => initialized === true)
        .map(([mediaId]) => mediaId)
        .sort()
        .join(","),
    [initializedMediaIds],
  );

  useEffect(() => {
    const generation = discoveryGeneration.current + 1;
    discoveryGeneration.current = generation;

    if (!watchingSignature) {
      completedMembershipScan.current = null;
      return;
    }

    if (completedMembershipScan.current === watchingSignature) {
      return;
    }

    completedMembershipScan.current = watchingSignature;
    const controller = new AbortController();
    const mediaIds = watchingSignature.split(",").map(Number);
    const nowUnix = Math.floor(Date.now() / 1000);
    const newMediaIds = mediaIds.filter((mediaId) => initializedMediaIds[String(mediaId)] !== true);
    const initializedIds = mediaIds.filter((mediaId) => initializedMediaIds[String(mediaId)] === true);
    const initialScanWindow = getWatchCheckScanWindow(nowUnix);
    const incrementalScanWindow = getWatchCheckScanWindow(nowUnix, lastSuccessfulScanAt);

    async function discover() {
      try {
        const requests = [
          ...(newMediaIds.length > 0
            ? [
                {
                  kind: "initial" as const,
                  mediaIds: newMediaIds,
                  promise: fetchAiringSchedulesForMediaIds(
                    newMediaIds,
                    initialScanWindow.startUnix,
                    initialScanWindow.endUnix,
                    controller.signal,
                  ),
                },
              ]
            : []),
          ...(initializedIds.length > 0
            ? [
                {
                  kind: "incremental" as const,
                  mediaIds: initializedIds,
                  promise: fetchAiringSchedulesForMediaIds(
                    initializedIds,
                    incrementalScanWindow.startUnix,
                    incrementalScanWindow.endUnix,
                    controller.signal,
                  ),
                },
              ]
            : []),
        ];
        const results = await Promise.allSettled(requests.map((request) => request.promise));

        if (controller.signal.aborted || discoveryGeneration.current !== generation) {
          return;
        }

        const successfulRequests = requests.flatMap((request, index) => {
          const result = results[index];
          return result.status === "fulfilled" ? [{ ...request, airingItems: result.value }] : [];
        });
        const allRequestsSucceeded = successfulRequests.length === requests.length;
        const discoveredItems = successfulRequests.flatMap((request) => request.airingItems);

        setTrackingState((current) => {
          if (discoveryGeneration.current !== generation) {
            return current;
          }

          const currentWatchingMediaIds = new Set(
            Object.values(current.watchingList ?? {})
              .map((item) => toAniListMediaId(item.mediaId))
              .filter(isNumber),
          );
          const currentChecks = isRecord(current.watchChecks) ? current.watchChecks : {};
          const nextWatchChecks = mergeDiscoveredWatchChecks(
            currentChecks,
            discoveredItems.filter((item) => currentWatchingMediaIds.has(item.animeId)),
            current.watchingList ?? {},
            nowUnix,
          );
          const nextInitializedMediaIds = isRecord(current.watchCheckInitializedMediaIds)
            ? { ...current.watchCheckInitializedMediaIds }
            : {};

          for (const request of successfulRequests) {
            if (request.kind === "initial") {
              for (const mediaId of request.mediaIds) {
                if (currentWatchingMediaIds.has(mediaId)) {
                  nextInitializedMediaIds[String(mediaId)] = true;
                }
              }
            }
          }

          return {
            ...current,
            watchChecks: nextWatchChecks,
            watchCheckInitializedMediaIds: nextInitializedMediaIds,
            ...(allRequestsSucceeded
              ? { watchCheckLastSuccessfulScanAt: incrementalScanWindow.endUnix }
              : {}),
          };
        });

        if (!allRequestsSucceeded) {
          completedMembershipScan.current = null;
        }
      } catch {
        // Discovery is supplemental; preserve the previous timestamp and state so a later scan can retry.
        completedMembershipScan.current = null;
      }
    }

    const debounceTimeout = window.setTimeout(() => {
      void discover();
    }, WATCH_CHECK_DISCOVERY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimeout);
      controller.abort();
    };
  }, [initializedMediaSignature, lastSuccessfulScanAt, setTrackingState, watchingSignature]);
}

function toAniListMediaId(value: number | string) {
  const mediaId = typeof value === "number" ? value : Number(value);
  return Number.isInteger(mediaId) && mediaId > 0 ? mediaId : null;
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
