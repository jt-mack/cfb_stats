import {
  fetchSeasonWeeks,
  FBS_GROUP,
  fetchParsedScoreboard,
  REGULAR_SEASON_TYPE,
  POSTSEASON_SEASON_TYPE,
  mapParsedScoreboardRow,
  mapScoreboardRowsToGames,
} from '../lib/sdv';
import { GamesRepo } from './games-repo';
import type { CalendarWeek, Game } from '../lib/types';

export class ScoreboardRepo {
  private gamesRepo = new GamesRepo();

  async getLiveScoreboard(): Promise<Game[]> {
    const rows = await fetchParsedScoreboard(
      { groups: FBS_GROUP, limit: 100 },
      { cacheKey: 'liveScoreboard', cacheTtlMs: 60 * 1000 }
    );
    return rows.map((r) => mapParsedScoreboardRow(r, r.season_type ?? REGULAR_SEASON_TYPE));
  }

  async getCalendar(year: number): Promise<CalendarWeek[]> {
    const weeks: CalendarWeek[] = [];

    for (const seasonType of [REGULAR_SEASON_TYPE, POSTSEASON_SEASON_TYPE]) {
      const seasonTypeLabel = seasonType === POSTSEASON_SEASON_TYPE ? 'postseason' : 'regular';
      try {
        const seasonWeeks = await fetchSeasonWeeks(year, seasonType);
        for (const w of seasonWeeks) {
          weeks.push({
            season: year,
            week: w.week,
            seasonType: seasonTypeLabel,
            startDate: w.startDate,
            endDate: w.endDate,
          });
        }
      } catch (err) {
        console.warn(`Calendar fetch failed for ${year} type ${seasonType}:`, err instanceof Error ? err.message : err);
      }
    }

    return weeks.sort((a, b) => {
      if (a.seasonType !== b.seasonType) return a.seasonType === 'regular' ? -1 : 1;
      return a.week - b.week;
    });
  }

  async getWeekGames(
    year: number,
    week: number,
    seasontype: number = REGULAR_SEASON_TYPE
  ): Promise<Game[]> {
    return this.gamesRepo.getWeekGamesFromScoreboard(year, week, seasontype);
  }
}
