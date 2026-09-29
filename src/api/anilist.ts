import type { AiringItem, MediaAiringMetadata } from "../types";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

type AniListAiringScheduleNode = {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
    episodes: number | null;
    nextAiringEpisode: {
      episode: number;
      airingAt: number;
    } | null;
    title: {
      english: string | null;
      romaji: string | null;
    };
    coverImage: {
      large: string | null;
    };
  };
};

type AniListResponse = {
  data?: {
    Page?: {
      pageInfo: {
        currentPage: number;
        hasNextPage: boolean;
      };
      airingSchedules: unknown[];
    };
  };
  errors?: Array<{ message: string }>;
};

const AIRING_SCHEDULE_QUERY = `
  query AiringSchedule($page: Int!, $airingAtGreater: Int!, $airingAtLesser: Int!) {
    Page(page: $page, perPage: 50) {
      pageInfo {
        currentPage
        hasNextPage
      }
      airingSchedules(
        airingAt_greater: $airingAtGreater
        airingAt_lesser: $airingAtLesser
        sort: TIME
      ) {
        id
        airingAt
        episode
        media {
          id
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
          title {
            english
            romaji
          }
          coverImage {
            large
          }
        }
      }
    }
  }
`;

const WATCH_CHECK_SCHEDULE_QUERY = `
  query WatchCheckSchedule($page: Int!, $mediaIds: [Int!]!, $airingAtGreater: Int!, $airingAtLesser: Int!) {
    Page(page: $page, perPage: 50) {
      pageInfo {
        currentPage
        hasNextPage
      }
      airingSchedules(
        airingAt_greater: $airingAtGreater
        airingAt_lesser: $airingAtLesser
        mediaId_in: $mediaIds
        sort: TIME
      ) {
        id
        airingAt
        episode
        media {
          id
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
          title {
            english
            romaji
          }
          coverImage {
            large
          }
        }
      }
    }
  }
`;

const WATCH_CHECK_MEDIA_BATCH_SIZE = 50;

export async function fetchAiringScheduleForDay(startUnix: number, endUnix: number, signal?: AbortSignal): Promise<AiringItem[]> {
  const allItems: AiringItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: {
          page,
          airingAtGreater: startUnix,
          airingAtLesser: endUnix,
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AniList request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as AniListResponse;

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(" "));
    }

    const pageData = payload.data?.Page;

    if (!pageData) {
      throw new Error("AniList returned an empty schedule response.");
    }

    const pageItems = Array.isArray(pageData.airingSchedules) ? pageData.airingSchedules : [];
    allItems.push(...pageItems.flatMap(mapAiringScheduleNode));
    hasNextPage = Boolean(pageData.pageInfo?.hasNextPage);
    page = Number(pageData.pageInfo?.currentPage) + 1;

    if (!Number.isFinite(page)) {
      break;
    }
  }

  return allItems.sort((left, right) => left.airingAt - right.airingAt);
}

export async function fetchAiringSchedulesForMediaIds(
  mediaIds: number[],
  startUnix: number,
  endUnix: number,
  signal?: AbortSignal,
): Promise<AiringItem[]> {
  const uniqueMediaIds = Array.from(new Set(mediaIds.filter((mediaId) => Number.isInteger(mediaId) && mediaId > 0)));
  const allItems: AiringItem[] = [];

  for (let offset = 0; offset < uniqueMediaIds.length; offset += WATCH_CHECK_MEDIA_BATCH_SIZE) {
    const mediaIdBatch = uniqueMediaIds.slice(offset, offset + WATCH_CHECK_MEDIA_BATCH_SIZE);
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetch(ANILIST_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: WATCH_CHECK_SCHEDULE_QUERY,
          variables: {
            page,
            mediaIds: mediaIdBatch,
            airingAtGreater: startUnix,
            airingAtLesser: endUnix,
          },
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AniList watch-check request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as AniListResponse;

      if (payload.errors?.length) {
        throw new Error(payload.errors.map((error) => error.message).join(" "));
      }

      const pageData = payload.data?.Page;

      if (!pageData) {
        throw new Error("AniList returned an empty watch-check response.");
      }

      const pageItems = Array.isArray(pageData.airingSchedules) ? pageData.airingSchedules : [];
      allItems.push(...pageItems.flatMap(mapAiringScheduleNode));
      hasNextPage = Boolean(pageData.pageInfo?.hasNextPage);
      page = Number(pageData.pageInfo?.currentPage) + 1;

      if (!Number.isFinite(page)) {
        break;
      }
    }
  }

  const uniqueItems = new Map<number, AiringItem>();

  for (const item of allItems) {
    uniqueItems.set(item.id, item);
  }

  return Array.from(uniqueItems.values()).sort((left, right) => left.airingAt - right.airingAt);
}

const MEDIA_METADATA_QUERY = `
  query WatchingMediaMetadata($mediaIds: [Int!]!) {
    Page(page: 1, perPage: 50) {
      media(id_in: $mediaIds) {
        id
        episodes
        nextAiringEpisode {
          episode
          airingAt
        }
      }
    }
  }
`;

type AniListMediaMetadataNode = {
  id: number;
  episodes: number | null;
  nextAiringEpisode: {
    episode: number;
    airingAt: number;
  } | null;
};

type AniListMediaMetadataResponse = {
  data?: {
    Page?: {
      media?: unknown[];
    };
  };
  errors?: Array<{ message: string }>;
};

export async function fetchMediaAiringMetadata(
  mediaIds: number[],
  signal?: AbortSignal,
): Promise<Record<string, MediaAiringMetadata>> {
  const uniqueMediaIds = Array.from(new Set(mediaIds.filter((mediaId) => Number.isInteger(mediaId) && mediaId > 0)));
  const metadata = new Map<string, MediaAiringMetadata>();

  for (let offset = 0; offset < uniqueMediaIds.length; offset += WATCH_CHECK_MEDIA_BATCH_SIZE) {
    const mediaIdBatch = uniqueMediaIds.slice(offset, offset + WATCH_CHECK_MEDIA_BATCH_SIZE);
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: MEDIA_METADATA_QUERY, variables: { mediaIds: mediaIdBatch } }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`AniList media metadata request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as AniListMediaMetadataResponse;

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(" "));
    }

    const mediaItems = Array.isArray(payload.data?.Page?.media) ? payload.data.Page.media : [];

    for (const rawItem of mediaItems) {
      const item = rawItem as Partial<AniListMediaMetadataNode>;
      if (typeof item.id !== "number") {
        continue;
      }

      const nextAiringEpisode = item.nextAiringEpisode;
      metadata.set(String(item.id), {
        episodes: typeof item.episodes === "number" ? item.episodes : null,
        nextAiringEpisode:
          nextAiringEpisode &&
          typeof nextAiringEpisode.episode === "number" &&
          typeof nextAiringEpisode.airingAt === "number"
            ? nextAiringEpisode
            : null,
      });
    }
  }

  return Object.fromEntries(metadata);
}

function mapAiringScheduleNode(node: unknown): AiringItem[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  const scheduleNode = node as Partial<AniListAiringScheduleNode>;
  const media = scheduleNode.media;

  if (
    typeof scheduleNode.id !== "number" ||
    typeof scheduleNode.airingAt !== "number" ||
    typeof scheduleNode.episode !== "number" ||
    !media ||
    typeof media.id !== "number"
  ) {
    return [];
  }

  const title = media.title?.english || media.title?.romaji || "Unknown Title";

  return [
    {
      id: scheduleNode.id,
      animeId: media.id,
      airingAt: scheduleNode.airingAt,
      episode: scheduleNode.episode,
      title,
      coverImage: media.coverImage?.large ?? null,
      episodes: typeof media.episodes === "number" ? media.episodes : null,
      nextAiringEpisode:
        media.nextAiringEpisode &&
        typeof media.nextAiringEpisode.episode === "number" &&
        typeof media.nextAiringEpisode.airingAt === "number"
          ? media.nextAiringEpisode
          : null,
    },
  ];
}
