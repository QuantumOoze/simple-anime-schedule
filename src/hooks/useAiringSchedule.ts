import { useEffect, useMemo, useState } from "react";
import { fetchAiringScheduleForDay } from "../api/anilist";
import type { AiringItem, AirType } from "../types";

type UseAiringScheduleResult = {
  items: AiringItem[];
  isLoading: boolean;
  error: string | null;
};

export function useAiringSchedule(selectedDate: Date, airType: AirType): UseAiringScheduleResult {
  const [items, setItems] = useState<AiringItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startUnix, endUnix] = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)];
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchedule() {
      setIsLoading(true);
      setError(null);

      try {
        const nextItems = await fetchAiringScheduleForDay(startUnix, endUnix);

        if (!controller.signal.aborted) {
          // TODO: When AnimeSchedule.net or another source is added, merge or replace
          // AniList items here so RAW/SUB/DUB filters can use source-specific metadata.
          setItems(applyAirTypeFilter(nextItems, airType));
        }
      } catch (scheduleError) {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(scheduleError instanceof Error ? scheduleError.message : "Unable to load schedule.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      controller.abort();
    };
  }, [airType, endUnix, startUnix]);

  return { items, isLoading, error };
}

function applyAirTypeFilter(items: AiringItem[], _airType: AirType) {
  // TODO: AniList does not distinguish RAW/SUB/DUB. Keep the UI state wired now,
  // then filter here once another schedule source supplies air-type metadata.
  return items;
}
