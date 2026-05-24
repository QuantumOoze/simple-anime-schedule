import type { AiringItem } from "../types";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

type AniListAiringScheduleNode = {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
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

export async function fetchAiringScheduleForDay(startUnix: number, endUnix: number): Promise<AiringItem[]> {
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
    },
  ];
}
