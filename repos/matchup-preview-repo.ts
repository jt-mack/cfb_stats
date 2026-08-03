import type { GameDetail } from './games-repo';
import { GamesRepo } from './games-repo';
import { TeamsRepo } from './teams-repo';
import { teamIndex } from '../lib/team-index';
import {
  buildMatchupFromSchedules,
  fetchGameSummaryRaw,
  fetchSeasonPowerIndex,
  getDefaultSeason,
  mapLeadersToPlayerStats,
  mapPowerIndexToAdvancedStats,
  mapPicksToOdds,
  mapSummaryToGameDetail,
  normalizeSummary,
  summaryToPicks,
  type SdvParsedPowerIndexRow,
} from '../lib/sdv';
import type {
  AdvancedSeasonStat,
  Game,
  Matchup,
  PlayerStat,
  PregameWinProbability,
  RosterPlayer,
} from '../lib/types';

export type PreviewPlayerStat = PlayerStat & {
  jersey: number | null;
  teamLogo: string | null;
};

export type GamePreview = {
  game: Game | null;
  completed: boolean;
  detail: GameDetail | null;
  matchup: Matchup | null;
  advancedSeasonStats: AdvancedSeasonStat[];
  playerSeasonStats: PreviewPlayerStat[];
  odds: PregameWinProbability | null;
  lines: import('../lib/types').BettingGame | null;
  media: import('../lib/types').GameMedia[];
  weather: import('../lib/types').GameWeather | null;
  statsYear: number;
};

const LEADER_CATEGORIES = ['passing', 'rushing', 'receiving'];

const EMPTY_PREVIEW = (statsYear: number): GamePreview => ({
  game: null,
  completed: false,
  detail: null,
  matchup: null,
  advancedSeasonStats: [],
  playerSeasonStats: [],
  odds: null,
  lines: null,
  media: [],
  weather: null,
  statsYear,
});

export class MatchupPreviewRepo {
  private teamsRepo = new TeamsRepo();
  private gamesRepo = new GamesRepo();

  async getGamePreview(gameId: number, season?: number): Promise<GamePreview> {
    const statsYear = season ?? getDefaultSeason();

    try {
      const summaryRaw = await fetchGameSummaryRaw(gameId);
      const detail = mapSummaryToGameDetail(normalizeSummary(summaryRaw, gameId));
      const game = detail.game;
      if (!game) return EMPTY_PREVIEW(statsYear);

      const completed = Boolean(game.completed);
      const year = season ?? game.season;
      const homeTeam = game.homeTeam;
      const awayTeam = game.awayTeam;

      let matchup: Matchup | null = null;
      try {
        const [homeSchedule, awaySchedule] = await Promise.all([
          this.gamesRepo.getSchedule(homeTeam, year),
          this.gamesRepo.getSchedule(awayTeam, year),
        ]);
        matchup = buildMatchupFromSchedules(homeTeam, awayTeam, homeSchedule, awaySchedule);
      } catch (err) {
        console.warn(`Matchup history unavailable for ${gameId}:`, err instanceof Error ? err.message : err);
      }

      if (completed) {
        return {
          game,
          completed: true,
          detail,
          matchup,
          advancedSeasonStats: [],
          playerSeasonStats: [],
          odds: null,
          lines: null,
          media: [],
          weather: null,
          statsYear: year,
        };
      }

      const { odds, lines, media, weather } = mapPicksToOdds(summaryToPicks(summaryRaw, gameId), game);
      const leaders = (summaryRaw.leaders as Record<string, unknown>[] | undefined) ?? [];

      let advancedSeasonStats: AdvancedSeasonStat[] = [];
      let effectiveStatsYear = year;
      let playerSeasonStats: PreviewPlayerStat[] = [];

      const defaultSeason = getDefaultSeason();
      const powerIndexYear = year > defaultSeason ? defaultSeason : year;

      if (powerIndexYear >= 2000) {
        const teams = await teamIndex.getAllTeams(powerIndexYear);
        const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

        let piRows: SdvParsedPowerIndexRow[] = [];
        try {
          piRows = await fetchSeasonPowerIndex(powerIndexYear, { timeoutMs: 6_000 });
        } catch (err) {
          console.warn(`Power index unavailable for preview ${gameId}:`, err instanceof Error ? err.message : err);
        }

        advancedSeasonStats = mapPowerIndexToAdvancedStats(piRows, powerIndexYear, idToSchool).filter(
          (s) => s.team === homeTeam || s.team === awayTeam
        );
        effectiveStatsYear = powerIndexYear;

        if (leaders.length > 0) {
          playerSeasonStats = await this.enrichPlayerStats(
            this.pickLeaders(mapLeadersToPlayerStats(leaders, effectiveStatsYear), homeTeam, awayTeam),
            homeTeam,
            awayTeam,
            effectiveStatsYear,
            teams
          );
        }
      }

      return {
        game,
        completed: false,
        detail: null,
        matchup,
        advancedSeasonStats,
        playerSeasonStats,
        odds,
        lines,
        media,
        weather,
        statsYear: effectiveStatsYear,
      };
    } catch (error) {
      console.error('getGamePreview failed:', error);
      throw error;
    }
  }

  private pickLeaders(stats: PlayerStat[], homeTeam: string, awayTeam: string): PlayerStat[] {
    const filtered = stats.filter((s) => s.team === homeTeam || s.team === awayTeam);
    const bestByCategory = new Map<string, PlayerStat>();
    for (const stat of filtered) {
      const categoryKey = LEADER_CATEGORIES.find((c) => stat.category?.toLowerCase().includes(c));
      if (!categoryKey) continue;
      const existing = bestByCategory.get(`${stat.team}:${categoryKey}`);
      const statVal = parseFloat(String(stat.stat).replace(/,/g, ''));
      const existingVal = existing ? parseFloat(String(existing.stat).replace(/,/g, '')) : -Infinity;
      if (!existing || (!Number.isNaN(statVal) && statVal > existingVal)) {
        bestByCategory.set(`${stat.team}:${categoryKey}`, stat);
      }
    }
    return [...bestByCategory.values()];
  }

  private normalizePlayerName(name: string): string {
    return name.toLowerCase().replace(/[^a-z]/g, '');
  }

  private findRosterPlayer(stat: PlayerStat, roster: RosterPlayer[]): RosterPlayer | undefined {
    const byId = roster.find((r) => r.id === stat.playerId);
    if (byId) return byId;
    const target = this.normalizePlayerName(stat.player);
    return roster.find((r) => {
      const compact = this.normalizePlayerName(`${r.firstName ?? ''}${r.lastName ?? ''}`);
      const spaced = this.normalizePlayerName(`${r.firstName ?? ''} ${r.lastName ?? ''}`);
      return compact === target || spaced === target;
    });
  }

  private async enrichPlayerStats(
    stats: PlayerStat[],
    homeTeam: string,
    awayTeam: string,
    year: number,
    fbsTeams: Awaited<ReturnType<typeof teamIndex.getAllTeams>>
  ): Promise<PreviewPlayerStat[]> {
    if (stats.length === 0) return [];

    const [homeRoster, awayRoster] = await Promise.all([
      this.teamsRepo.getRoster(homeTeam, year).catch(() => []),
      this.teamsRepo.getRoster(awayTeam, year).catch(() => []),
    ]);

    const roster = [...homeRoster, ...awayRoster];
    const logoByTeam = new Map<string, string>();
    for (const team of fbsTeams) {
      if (team.logos?.[0]) logoByTeam.set(team.school, team.logos[0]);
    }

    return stats.map((stat) => {
      const match = this.findRosterPlayer(stat, roster);
      const displayName = match
        ? [match.firstName, match.lastName].filter(Boolean).join(' ') || stat.player
        : stat.player;
      return {
        ...stat,
        player: displayName,
        position: match?.position ?? stat.position,
        jersey: match?.jersey ?? null,
        teamLogo: logoByTeam.get(stat.team) ?? null,
      };
    });
  }
}
