import { getDefaultSeason } from '../lib/espn-client';
import { summary as fetchSummary } from '../lib/espn';
import type { SdvCfbSummaryRaw, SdvEspnTeam, SdvParsedPowerIndexRow } from '../lib/espn-types';
import {
  drivesFromSummary,
  mapLeadersToPlayerStats,
  mapPicksToOdds,
  mapScoringPlays,
  mapSummaryGameLeaders,
  mapSummaryToGameDetail,
  normalizeSummary,
  summaryToPicks,
  type GameLeaderEntry,
  type ScoringPlayEntry,
} from '../lib/game-mappers';
import { teamIndex } from '../lib/team-index';
import type {
  AdvancedSeasonStat,
  Game,
  GameDetail,
  Matchup,
  PlayerStat,
  PregameWinProbability,
  RosterPlayer,
} from '../lib/types';
import { fetchSeasonPowerIndex, mapPowerIndexToAdvancedStats } from './ratings-repo';
import { TeamsRepo } from './teams-repo';

export type { GameDetail, GameLeaderEntry, ScoringPlayEntry };

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
const SERIES_LOOKBACK_YEARS = 5;

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

export function buildMatchupFromSchedules(
  team1: string,
  team2: string,
  schedule1: Game[],
  schedule2: Game[] = []
): Matchup {
  const allGames = [...schedule1, ...schedule2];
  const h2h = allGames.filter(
    (g) =>
      (g.homeTeam === team1 && g.awayTeam === team2) || (g.homeTeam === team2 && g.awayTeam === team1)
  );
  const seen = new Set<number>();
  const unique = h2h.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return g.completed;
  });

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  const games = unique.map((g) => {
    const homeScore = g.homePoints;
    const awayScore = g.awayPoints;
    if (homeScore != null && awayScore != null) {
      const team1Home = g.homeTeam === team1;
      const team1Score = team1Home ? homeScore : awayScore;
      const team2Score = team1Home ? awayScore : homeScore;
      if (team1Score > team2Score) team1Wins++;
      else if (team2Score > team1Score) team2Wins++;
      else ties++;
    }
    return {
      season: g.season,
      date: g.startDate,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore,
      awayScore,
    };
  });

  const seasons = games.map((g) => g.season).filter((y) => Number.isFinite(y));
  const sinceSeason = seasons.length ? Math.min(...seasons) : undefined;

  return { team1, team2, team1Wins, team2Wins, ties, sinceSeason, games };
}

function teamMatches(statTeam: string, target: string): boolean {
  const a = statTeam.toLowerCase();
  const b = target.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function pickLeaders(stats: PlayerStat[], homeTeam: string, awayTeam: string): PlayerStat[] {
  const filtered = stats.filter(
    (s) => teamMatches(s.team, homeTeam) || teamMatches(s.team, awayTeam)
  );
  const bestByCategory = new Map<string, PlayerStat>();
  for (const stat of filtered) {
    const categoryKey = LEADER_CATEGORIES.find(
      (c) =>
        stat.category?.toLowerCase().includes(c) || stat.statType?.toLowerCase().includes(c)
    );
    if (!categoryKey) continue;
    const key = `${stat.team}:${categoryKey}`;
    if (!bestByCategory.has(key)) {
      bestByCategory.set(key, {
        ...stat,
        team: teamMatches(stat.team, homeTeam) ? homeTeam : awayTeam,
      });
    }
  }
  return [...bestByCategory.values()];
}

function toPreviewPlayerStats(
  stats: PlayerStat[],
  fbsTeams: Awaited<ReturnType<typeof teamIndex.getAllTeams>>
): PreviewPlayerStat[] {
  const logoByTeam = new Map<string, string>();
  for (const team of fbsTeams) {
    if (team.logos?.[0]) logoByTeam.set(team.school, team.logos[0]);
  }
  return stats.map((stat) => {
    const parts = stat.player.split(/\s+/);
    const player: RosterPlayer = {
      id: stat.playerId,
      firstName: parts[0] ?? stat.player,
      lastName: parts.slice(1).join(' ') || '',
      team: stat.team,
      height: null,
      weight: null,
      jersey: null,
      year: 0,
      position: stat.position || null,
    };
    return {
      ...stat,
      player,
      jersey: player.jersey,
      teamLogo: logoByTeam.get(stat.team) ?? null,
    };
  });
}

export class GamesRepo {
  private teamsRepo = new TeamsRepo();

  async getGameSummaryRaw(gameId: number): Promise<SdvCfbSummaryRaw> {
    return fetchSummary(gameId, { cacheKey: `gameSummaryRaw:${gameId}`, cacheTtlMs: 60 * 60 * 1000 });
  }

  async getGameDetail(gameId: number): Promise<GameDetail> {
    const raw = await this.getGameSummaryRaw(gameId);
    return mapSummaryToGameDetail(normalizeSummary(raw, gameId));
  }

  async getGamePicks(gameId: number) {
    const raw = await this.getGameSummaryRaw(gameId);
    return summaryToPicks(raw, gameId);
  }

  async getDrivesForGame(gameId: number) {
    try {
      const raw = await this.getGameSummaryRaw(gameId);
      return drivesFromSummary(raw);
    } catch (err) {
      console.warn(`getDrivesForGame failed for ${gameId}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getPlaysForGame(gameId: number) {
    try {
      const raw = await this.getGameSummaryRaw(gameId);
      return drivesFromSummary(raw).flatMap((d) => (Array.isArray(d.plays) ? d.plays : []));
    } catch (err) {
      console.warn(`getPlaysForGame failed for ${gameId}:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getSeries(team1: string, team2: string, throughSeason: number): Promise<Matchup> {
    const schedules: Game[] = [];
    for (let i = 0; i < SERIES_LOOKBACK_YEARS; i++) {
      const season = throughSeason - i;
      try {
        const games = await this.teamsRepo.getSchedule(team1, season);
        schedules.push(...games);
      } catch (err) {
        console.warn(
          `Series schedule ${team1} ${season} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    }
    const matchup = buildMatchupFromSchedules(team1, team2, schedules);
    matchup.sinceSeason = throughSeason - SERIES_LOOKBACK_YEARS + 1;
    matchup.games.sort((a, b) => b.season - a.season || b.date.localeCompare(a.date));
    return matchup;
  }

  async getGamePreview(gameId: number, season?: number): Promise<GamePreview> {
    const statsYear = season ?? getDefaultSeason();

    try {
      const summaryRaw = await this.getGameSummaryRaw(gameId);
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
        matchup = await this.getSeries(homeTeam, awayTeam, year);
      } catch (err) {
        console.warn(
          `Series matchup unavailable for ${gameId}:`,
          err instanceof Error ? err.message : err
        );
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

        if (!completed && leaders.length > 0) {
          playerSeasonStats = toPreviewPlayerStats(
            pickLeaders(mapLeadersToPlayerStats(leaders, effectiveStatsYear), homeTeam, awayTeam),
            teams
          );
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
}

export type { GameWithOdds } from '../lib/types';
