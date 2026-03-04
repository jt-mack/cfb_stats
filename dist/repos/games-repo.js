"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesRepo = void 0;
const cfbd_1 = require("cfbd");
const cfbd_client_1 = require("../lib/cfbd-client");
class GamesRepo {
    /**
     * Get schedule (games) for a team and year.
     */
    async getSchedule(team, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getGames)({ query: { team, year } }));
    }
    /**
     * Get pregame win probabilities for a team and year (for odds).
     */
    async getPregameWinProbabilities(team, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getPregameWinProbabilities)({ query: { team, year } }));
    }
    /**
     * Get schedule with odds merged (custom merged type).
     */
    async getScheduleWithOdds(team, year) {
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
    async getGameById(gameId) {
        const games = await (0, cfbd_client_1.unwrap)((0, cfbd_1.getGames)({ query: { id: gameId } }));
        return games?.[0] ?? null;
    }
    /**
     * Get game team stats for a game.
     */
    async getGameTeamStats(gameId) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getGameTeamStats)({ query: { id: gameId } }));
    }
    /**
     * Get game player stats for a game.
     */
    async getGamePlayerStats(gameId) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getGamePlayerStats)({ query: { id: gameId } }));
    }
    /**
     * Get advanced box score for a game.
     */
    async getAdvancedBoxScore(gameId) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getAdvancedBoxScore)({ query: { id: gameId } }));
    }
    /**
     * Get full game detail (game + team stats + player stats + advanced box score).
     */
    async getGameDetail(gameId) {
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
exports.GamesRepo = GamesRepo;
