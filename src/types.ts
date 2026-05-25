export type AirType = "RAW" | "SUB" | "DUB" | "ALL";

export type AiringItem = {
  id: number;
  animeId: number;
  airingAt: number;
  episode: number;
  title: string;
  coverImage: string | null;
};

export type FollowedAnime = {
  id: string;
  provider: "anilist";
  mediaId: number | string;
  displayTitle?: string;
};

export type WatchingItem = FollowedAnime & {
  displayTitle: string;
};

export type CompletedShowItem = WatchingItem & {
  completedAt: string;
};

export type ReleaseReminder = {
  id: string;
  provider: "anilist";
  mediaId: number | string;
  episode: number;
  displayTitle: string;
  airingAt: number;
  localTime: string;
  createdAt: string;
  notified?: boolean;
};

export type UserTrackingState = {
  followedAnimeIds?: Array<number | string>;
  following: Record<string, FollowedAnime>;
  watchingList: Record<string, WatchingItem>;
  completedShows: Record<string, CompletedShowItem>;
  releaseReminders: Record<string, ReleaseReminder>;
  watchedEpisodes: Record<string, boolean>;
  airType: AirType;
};
