import type { GameDetail } from './games-repo';
import {
  GamesRepo,
  mapLeadersToPlayerStats,
  mapPicksToOdds,
  mapScoringPlays,
  mapSummaryGameLeaders,
  mapSummaryToGameDetail,
  normalizeSummary,
  summaryToPicks,
  type GameLeaderEntry,
  type ScoringPlayEntry,
} from './games-repo';
import { LeadersRepo } from './leaders-repo';
import { buildMatchupFromSchedules, MatchupSeriesRepo } from './matchup-series-repo';
import { TeamsRepo } from './teams-repo';
import { fetchSeasonPowerIndex, mapPowerIndexToAdvancedStats } from './ratings-repo';
import { getDefaultSeason } from '../lib/espn-client';
import type { SdvEspnTeam, SdvParsedPowerIndexRow } from '../lib/espn-types';
import { teamIndex } from '../lib/team-index';
import type {
  AdvancedSeasonStat,
  Game,
  LeaderEntry,
  Matchup,
  PlayerStat,
  PregameWinProbability,
  RosterPlayer,
} from '../lib/types';

export type PreviewPlayerStat = Omit<PlayerStat, 'player'> & {
  player: RosterPlayer;
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
  gameLeaders: GameLeaderEntry[];
  scoringPlays: ScoringPlayEntry[];
  odds: PregameWinProbability | null;
  lines: import('../lib/types').BettingGame | null;
  media: import('../lib/types').GameMedia[];
  weather: import('../lib/types').GameWeather | null;
  statsYear: number;
  statsLabel: string;
};

const STATS_LABEL = 'ESPN efficiency (season-to-date)';

const LEADER_CATEGORIES = ['passing', 'rushing', 'receiving'];

const EMPTY_PREVIEW = (statsYear: number): GamePreview => ({
  game: null,
  completed: false,
  detail: null,
  matchup: null,
  advancedSeasonStats: [],
  playerSeasonStats: [],
  gameLeaders: [],
  scoringPlays: [],
  odds: null,
  lines: null,
  media: [],
  weather: null,
  statsYear,
  statsLabel: STATS_LABEL,
});

function leaderEntriesToPlayerStats(entries: LeaderEntry[]): PlayerStat[] {
  return entries.map((entry) => ({
    playerId: entry.playerId,
    player: entry.player,
    team: entry.team,
    position: entry.position ?? '',
    category: entry.category,
    statType: entry.category,
    stat: entry.displayValue || String(entry.value),
    season: entry.season,
  }));
}

function brandColor(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return `#${String(raw).replace('#', '')}`;
}

function competitorBrandBySchool(
  competitions: Record<string, unknown>[] | undefined
): Map<string, { color: string | null; alternateColor: string | null }> {
  const brandBySchool = new Map<string, { color: string | null; alternateColor: string | null }>();
  const competitors =
    (competitions?.[0]?.competitors as Record<string, unknown>[] | undefined) ?? [];
  for (const c of competitors) {
    const t = c.team as SdvEspnTeam | undefined;
    if (!t) continue;
    const school = t.location ?? t.displayName ?? '';
    if (!school) continue;
    brandBySchool.set(school, {
      color: brandColor(t.color),
      alternateColor: brandColor(t.alternateColor),
    });
  }
  return brandBySchool;
}

export class MatchupPreviewRepo {
  private teamsRepo = new TeamsRepo();
  private gamesRepo = new GamesRepo();
  private seriesRepo = new MatchupSeriesRepo();
  private leadersRepo = new LeadersRepo();

  async getGamePreview(gameId: number, season?: number): Promise<GamePreview> {
    const statsYear = season ?? getDefaultSeason();

    try {
      const summaryRaw = await this.gamesRepo.getGameSummaryRaw(gameId);
      const detail = mapSummaryToGameDetail(normalizeSummary(summaryRaw, gameId));
      const game = detail.game;
      if (!game) return EMPTY_PREVIEW(statsYear);

      const completed = Boolean(game.completed);
      const year = season ?? game.season;
      const homeTeam = game.homeTeam;
      const awayTeam = game.awayTeam;

      const leaders = (summaryRaw.leaders as Record<string, unknown>[] | undefined) ?? [];
      const gameLeaders = mapSummaryGameLeaders(leaders);
      const scoringPlays = completed ? mapScoringPlays(summaryRaw.scoringPlays) : [];
      const { odds, lines, media, weather } = mapPicksToOdds(summaryToPicks(summaryRaw, gameId), game);

      let matchup: Matchup | null = null;
      try {
        matchup = await this.seriesRepo.getSeries(homeTeam, awayTeam, year);
      } catch (err) {
        console.warn(
          `Series matchup unavailable for ${gameId}, falling back to same-year schedules:`,
          err instanceof Error ? err.message : err
        );
        try {
          const [homeSchedule, awaySchedule] = await Promise.all([
            this.gamesRepo.getSchedule(homeTeam, year),
            this.gamesRepo.getSchedule(awayTeam, year),
          ]);
          matchup = buildMatchupFromSchedules(homeTeam, awayTeam, homeSchedule, awaySchedule);
        } catch (fallbackErr) {
          console.warn(
            `Matchup history unavailable for ${gameId}:`,
            fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
          );
        }
      }

      let advancedSeasonStats: AdvancedSeasonStat[] = [];
      let effectiveStatsYear = year;
      let playerSeasonStats: PreviewPlayerStat[] = [];

      const defaultSeason = getDefaultSeason();
      const powerIndexYear = year > defaultSeason ? defaultSeason : year;
      const header = summaryRaw.header as Record<string, unknown> | undefined;
      const competitions = (header?.competitions as Record<string, unknown>[] | undefined) ?? [];
      const brandBySchool = competitorBrandBySchool(competitions);

      if (powerIndexYear >= 2000) {
        const teams = await teamIndex.getAllTeams(powerIndexYear);
        const idToSchool = new Map(teams.map((t) => [t.id, t.school]));

        let piRows: SdvParsedPowerIndexRow[] = [];
        try {
          piRows = await fetchSeasonPowerIndex(powerIndexYear, { timeoutMs: 6_000 });
        } catch (err) {
          console.warn(
            `Power index unavailable for preview ${gameId}:`,
            err instanceof Error ? err.message : err
          );
        }

        advancedSeasonStats = mapPowerIndexToAdvancedStats(piRows, powerIndexYear, idToSchool)
          .filter((s) => s.team === homeTeam || s.team === awayTeam)
          .map((s) => {
            const brand = brandBySchool.get(s.team);
            return {
              ...s,
              color: brand?.color ?? null,
              alternateColor: brand?.alternateColor ?? null,
            };
          });
        effectiveStatsYear = powerIndexYear;

        if (!completed) {
          let rawPlayerStats: PlayerStat[] = [];

          if (leaders.length > 0) {
            rawPlayerStats = this.pickLeaders(
              mapLeadersToPlayerStats(leaders, effectiveStatsYear),
              homeTeam,
              awayTeam
            );
          } else {
            const [homeId, awayId] = await Promise.all([
              teamIndex.resolveTeamId(homeTeam, effectiveStatsYear),
              teamIndex.resolveTeamId(awayTeam, effectiveStatsYear),
            ]);
            const [homeLeaders, awayLeaders] = await Promise.all([
              homeId != null
                ? this.leadersRepo.getTeamLeaders(homeId, effectiveStatsYear).catch(() => [])
                : Promise.resolve([]),
              awayId != null
                ? this.leadersRepo.getTeamLeaders(awayId, effectiveStatsYear).catch(() => [])
                : Promise.resolve([]),
            ]);
            rawPlayerStats = this.pickLeaders(
              leaderEntriesToPlayerStats([...homeLeaders, ...awayLeaders]),
              homeTeam,
              awayTeam
            );
          }

          if (rawPlayerStats.length > 0) {
            playerSeasonStats = await this.enrichPlayerStats(
              rawPlayerStats,
              homeTeam,
              awayTeam,
              effectiveStatsYear,
              teams
            );
          }
        }
      }

      if (completed) {
        return {
          game,
          completed: true,
          detail,
          matchup,
          advancedSeasonStats,
          playerSeasonStats: [],
          gameLeaders,
          scoringPlays,
          odds: null,
          lines: null,
          media,
          weather,
          statsYear: effectiveStatsYear,
          statsLabel: STATS_LABEL,
        };
      }

      return {
        game,
        completed: false,
        detail: null,
        matchup,
        advancedSeasonStats,
        playerSeasonStats,
        gameLeaders,
        scoringPlays: [],
        odds,
        lines,
        media,
        weather,
        statsYear: effectiveStatsYear,
        statsLabel: STATS_LABEL,
      };
    } catch (error) {
      console.error('getGamePreview failed:', error);
      throw error;
    }
  }

  private teamMatches(statTeam: string, target: string): boolean {
    const a = statTeam.toLowerCase();
    const b = target.toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  }

  private pickLeaders(stats: PlayerStat[], homeTeam: string, awayTeam: string): PlayerStat[] {
    const filtered = stats.filter(
      (s) => this.teamMatches(s.team, homeTeam) || this.teamMatches(s.team, awayTeam)
    );
    const bestByCategory = new Map<string, PlayerStat>();
    for (const stat of filtered) {
      const categoryKey = LEADER_CATEGORIES.find(
        (c) =>
          stat.category?.toLowerCase().includes(c) || stat.statType?.toLowerCase().includes(c)
      );
      if (!categoryKey) continue;
      const key = `${stat.team}:${categoryKey}`;
      // ESPN already orders leaders; keep the first entry per team/category.
      if (!bestByCategory.has(key)) {
        bestByCategory.set(key, {
          ...stat,
          team: this.teamMatches(stat.team, homeTeam) ? homeTeam : awayTeam,
        });
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
      const player: RosterPlayer =
        match ??
        ({
          id: stat.playerId,
          firstName: stat.player.split(/\s+/)[0] ?? stat.player,
          lastName: stat.player.split(/\s+/).slice(1).join(' ') || '',
          team: stat.team,
          height: null,
          weight: null,
          jersey: null,
          year: 0,
          position: stat.position || null,
        } satisfies RosterPlayer);
      return {
        ...stat,
        player,
        jersey: player.jersey,
        teamLogo: logoByTeam.get(stat.team) ?? null,
      };
    });
  }
}
