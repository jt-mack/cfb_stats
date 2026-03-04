import {
  getGames,
  getPregameWinProbabilities,
  getGameTeamStats,
  getGamePlayerStats,
  getAdvancedBoxScore,
} from 'cfbd';
import type { Game, PregameWinProbability, GameTeamStats, GamePlayerStats, AdvancedBoxScore } from 'cfbd';
import { unwrap } from '../lib/cfbd-client';

/** Game with optional pregame odds (merged type) */
export type GameWithOdds = Game & { odds?: PregameWinProbability };

/** Game detail composite (game + team stats + player stats + advanced box score) */
export type GameDetail = {
  game: Game | null;
  teamStats: GameTeamStats[] | null;
  playerStats: GamePlayerStats[] | null;
  advancedBoxScore: AdvancedBoxScore | null;
};

export class GamesRepo {
  /**
   * Get schedule (games) for a team and year.
   */
  async getSchedule(team: string, year: number) {
    return unwrap(getGames({ query: { team, year } }));
  }

  /**
   * Get pregame win probabilities for a team and year (for odds).
   */
  async getPregameWinProbabilities(team: string, year: number) {
    return unwrap(getPregameWinProbabilities({ query: { team, year } }));
  }

  /**
   * Get schedule with odds merged (custom merged type).
   */
  async getScheduleWithOdds(team: string, year: number): Promise<GameWithOdds[]> {
    const [games, odds] = await Promise.all([
      this.getSchedule(team, year),
      this.getPregameWinProbabilities(team, year),
    ]);
    const oddsByGameId = new Map((odds || []).map((o) => [o.gameId, o]));
    return (games || []).map((g) => ({
      ...g,
      odds: oddsByGameId.get(g.id),
    }));
  }

  /**
   * Get a single game by id.
   */
  async getGameById(gameId: number) {
    const games = await unwrap(getGames({ query: { id: gameId } }));
    return games?.[0] ?? null;
  }

  /**
   * Get game team stats for a game.
   */
  async getGameTeamStats(gameId: number) {
    return unwrap(getGameTeamStats({ query: { id: gameId } }));
  }

  /**
   * Get game player stats for a game.
   */
  async getGamePlayerStats(gameId: number) {
    return unwrap(getGamePlayerStats({ query: { id: gameId } }));
  }

  /**
   * Get advanced box score for a game.
   */
  async getAdvancedBoxScore(gameId: number) {
    return unwrap(getAdvancedBoxScore({ query: { id: gameId } }));
  }

  /**
   * Get full game detail (game + team stats + player stats + advanced box score).
   */
  async getGameDetail(gameId: number): Promise<GameDetail> {
    const [game, teamStats, playerStats, advancedBoxScore] = await Promise.all([
      this.getGameById(gameId),
      this.getGameTeamStats(gameId).then((d) => d).catch(() => null),
      this.getGamePlayerStats(gameId).then((d) => d).catch(() => null),
      this.getAdvancedBoxScore(gameId).then((d) => d).catch(() => null),
    ]);
    return {
      game,
      teamStats: teamStats ?? null,
      playerStats: playerStats ?? null,
      advancedBoxScore: advancedBoxScore ?? null,
    };
  }
}
