import { fetchGamePicks, mapPicksToOdds } from '../lib/sdv';
import type { BettingGame, GameMedia, GameWeather, PregameWinProbability } from '../lib/types';
import { GamesRepo } from './games-repo';

export type GameEnrichment = {
  gameId: number;
  odds: PregameWinProbability | null;
  media: GameMedia[];
  weather: GameWeather | null;
  lines: BettingGame | null;
};

export class ScheduleEnrichmentRepo {
  private gamesRepo = new GamesRepo();

  async getEnrichmentForTeam(team: string, year: number): Promise<GameEnrichment[]> {
    const games = await this.gamesRepo.getSchedule(team, year);
    if (!games.length) return [];

    const upcoming = games.filter((g) => !g.completed).slice(0, 6);

    const upcomingResults = await Promise.all(
      upcoming.map(async (game) => {
        try {
          const picks = await fetchGamePicks(game.id, {
            cacheKey: `enrichPicks:${game.id}`,
            cacheTtlMs: 60 * 60 * 1000,
            timeoutMs: 8_000,
          });
          const { odds, lines, media, weather } = mapPicksToOdds(picks, game);
          return { gameId: game.id, odds, media, weather, lines } satisfies GameEnrichment;
        } catch {
          return {
            gameId: game.id,
            odds: null,
            media: [],
            weather: null,
            lines: null,
          } satisfies GameEnrichment;
        }
      })
    );

    const completedResults = games
      .filter((g) => g.completed)
      .map(
        (game) =>
          ({
            gameId: game.id,
            odds: null,
            media: [],
            weather: null,
            lines: null,
          }) satisfies GameEnrichment
      );

    return [...upcomingResults, ...completedResults];
  }
}
