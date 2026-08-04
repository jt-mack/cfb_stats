import { GamesRepo } from './games-repo';
import { buildMatchupFromSchedules } from '../lib/sdv';
import { routeCache } from '../lib/cache';
import type { Game, Matchup } from '../lib/types';

/** How many prior seasons to include when calculating head-to-head series. */
export const SERIES_LOOKBACK_YEARS = 15;

export class MatchupSeriesRepo {
  private gamesRepo = new GamesRepo();

  async getSeries(
    team1: string,
    team2: string,
    throughSeason: number,
    lookback = SERIES_LOOKBACK_YEARS
  ): Promise<Matchup> {
    const sinceSeason = throughSeason - lookback + 1;
    const cacheKey = `series_${team1}_${team2}_${sinceSeason}_${throughSeason}`;
    const cached = routeCache.get<Matchup>(cacheKey);
    if (cached) return cached;

    const seasons = Array.from({ length: lookback }, (_, i) => throughSeason - i);
    const schedules: Game[] = [];

    // Pull one team's schedules across seasons (fewer calls than both teams).
    for (const season of seasons) {
      try {
        const games = await this.gamesRepo.getSchedule(team1, season);
        schedules.push(...games);
      } catch (err) {
        console.warn(
          `Series schedule ${team1} ${season} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const matchup = buildMatchupFromSchedules(team1, team2, schedules, []);
    matchup.sinceSeason = sinceSeason;
    matchup.games.sort((a, b) => b.season - a.season || b.date.localeCompare(a.date));

    routeCache.set(cacheKey, matchup, 24 * 60 * 60);
    return matchup;
  }
}
