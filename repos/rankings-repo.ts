import { fetchParsedRankings, parsePollWeek } from '../lib/sdv';
import type { PollWeek } from '../lib/types';

export class RankingsRepo {
  async getRankings(season?: number): Promise<PollWeek> {
    const raw = await fetchParsedRankings(season, {
      cacheKey: season != null ? `espnRankingsPollWeek:${season}` : 'espnRankingsPollWeek:live',
      cacheTtlMs: 15 * 60 * 1000,
    });
    return parsePollWeek(raw);
  }
}
