export function episodeKey(animeId: number | string, episode: number) {
  return `${animeId}:${episode}`;
}
