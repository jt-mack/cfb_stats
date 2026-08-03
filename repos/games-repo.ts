import {
  fetchGameSummary,
  fetchParsedScoreboard,
  fetchTeamScheduleRaw,
  FBS_GROUP,
  REGULAR_SEASON_TYPE,
  mapScoreboardRowsToGames,
  mapSummaryToGameDetail,
} from '../lib/sdv';
import { getTeamSchedule } from '../lib/schedule-service';
import { teamIndex } from '../lib/team-index';
import { extractOddsFromRawSchedule } from './ratings-repo';
import type { Game, GameDetail, GameWithOdds } from '../lib/types';

export class GamesRepo {
  async getSchedule(team: string, year: number): Promise<Game[]> {
    return getTeamSchedule(team, year);
  }

  async getScheduleWithOdds(team: string, year: number): Promise<GameWithOdds[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const games = await this.getSchedule(team, year);
    if (!teamId) return games.map((g) => ({ ...g, odds: undefined }));

    try {
      const raw = await fetchTeamScheduleRaw({ teamId, season: year });
      return extractOddsFromRawSchedule(raw.events ?? [], games);
    } catch (err) {
      console.warn(`Schedule odds unavailable for ${team} ${year}:`, err instanceof Error ? err.message : err);
      return games.map((g) => ({ ...g, odds: undefined }));
    }
  }

  async getGameDetail(gameId: number): Promise<GameDetail> {
    const summary = await fetchGameSummary(gameId);
    return mapSummaryToGameDetail(summary);
  }

  async getWeekGamesFromScoreboard(year: number, week: number): Promise<Game[]> {
    const rows = await fetchParsedScoreboard({
      season: year,
      week,
      seasontype: REGULAR_SEASON_TYPE,
      groups: FBS_GROUP,
      limit: 300,
    });
    return mapScoreboardRowsToGames(rows, week);
  }
}

export type { GameDetail, GameWithOdds };
