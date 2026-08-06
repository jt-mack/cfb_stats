import { getCfb, sdvRequest } from '../lib/espn-client';
import { FBS_GROUP, REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import type {
  SdvCfbPicks,
  SdvCfbSummary,
  SdvCfbSummaryRaw,
  SdvEspnTeam,
  SdvParsedScoreboardRow,
  SdvTeamScheduleResponse,
} from '../lib/espn-types';
import {
  getTeamSchedule,
  mapScheduleEvent,
  mapScoreboardRowsToGames,
} from '../lib/schedule-service';
import { teamIndex } from '../lib/team-index';
import type {
  AdvancedBoxScoreData,
  BettingGame,
  Game,
  GameDetail,
  GameMedia,
  GamePlayerStatEntry,
  GameTeamStatEntry,
  GameWeather,
  GameWithOdds,
  PlayerStat,
  PregameWinProbability,
  Venue,
} from '../lib/types';
import { extractOddsFromRawSchedule } from './ratings-repo';
import { normalizeVenue } from '../utils/format';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function numRequired(value: unknown): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Normalize `espnCfbSummary` raw JSON to the shape our mappers expect. */
export function normalizeSummary(raw: SdvCfbSummaryRaw, gameId?: number): SdvCfbSummary {
  const header = raw.header ?? {};
  const competitions = (header.competitions as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: gameId ?? numRequired(header.id),
    boxScore: raw.boxscore,
    gameInfo: raw.gameInfo,
    drives: raw.drives,
    leaders: raw.leaders,
    header: raw.header,
    teams: competitions[0]?.competitors,
    scoringPlays: raw.scoringPlays,
    winProbability: raw.winprobability,
    competitions,
    season: header.season,
    week: header.week,
    standings: raw.standings,
  };
}

/** Extract pick/odds fields from `espnCfbSummary` raw JSON. */
export function summaryToPicks(raw: SdvCfbSummaryRaw, gameId?: number): SdvCfbPicks {
  const header = raw.header ?? {};
  const competitions = (header.competitions as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: gameId ?? numRequired(header.id),
    gameInfo: raw.gameInfo,
    leaders: raw.leaders,
    header: raw.header,
    teams: competitions[0]?.competitors,
    competitions,
    winProbability: raw.winprobability,
    pickcenter: raw.pickcenter,
    againstTheSpread: raw.againstTheSpread,
    odds: raw.odds,
    season: header.season,
    week: header.week,
    standings: raw.standings,
  };
}

export function mapSummaryToGameDetail(summary: SdvCfbSummary): GameDetail {
  const header = summary.header as Record<string, unknown> | undefined;
  const competitions = (header?.competitions as Record<string, unknown>[] | undefined) ?? [];
  const comp = competitions[0];
  const gameId = num(summary.id ?? header?.id) ?? 0;
  const season = (summary.season as { year?: number })?.year ?? 0;
  const week = (summary.week as { number?: number })?.number ?? 0;
  const gameInfo = summary.gameInfo as Record<string, unknown> | undefined;
  const venue = gameInfo?.venue as Record<string, unknown> | undefined;

  const game = mapScheduleEvent(
    { id: gameId, venue: venue as Venue | undefined, date: comp?.date, week: { number: week }, competitions: [comp] },
    season
  );

  const boxScore = summary.boxScore as Record<string, unknown> | undefined;
  const teamStats: GameTeamStatEntry[] = [];
  const playerStats: GamePlayerStatEntry[] = [];

  if (boxScore?.teams) {
    const teams = boxScore.teams as Record<string, unknown>[];
    const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
    const colorByHomeAway = new Map<string, { color?: string; alternateColor?: string }>();
    for (const c of competitors) {
      const t = c.team as SdvEspnTeam | undefined;
      const ha = String(c.homeAway ?? '');
      if (t && ha) {
        colorByHomeAway.set(ha, {
          color: t.color ? `#${String(t.color).replace('#', '')}` : undefined,
          alternateColor: t.alternateColor
            ? `#${String(t.alternateColor).replace('#', '')}`
            : undefined,
        });
      }
    }
    teamStats.push({
      id: gameId,
      teams: teams.map((t) => {
        const teamInfo = t.team as SdvEspnTeam;
        const stats = (t.statistics as { name?: string; displayValue?: string; label?: string }[] | undefined) ?? [];
        const homeAway = String(t.homeAway ?? '');
        const fromComp = colorByHomeAway.get(homeAway);
        const color = teamInfo.color
          ? `#${String(teamInfo.color).replace('#', '')}`
          : fromComp?.color ?? null;
        const alternateColor = teamInfo.alternateColor
          ? `#${String(teamInfo.alternateColor).replace('#', '')}`
          : fromComp?.alternateColor ?? null;
        return {
          teamId: num(teamInfo.id) ?? 0,
          team: teamInfo.location ?? teamInfo.displayName ?? '',
          homeAway,
          points: num((t as { score?: unknown }).score),
          color,
          alternateColor,
          stats: stats.map((s) => ({ category: s.name ?? s.label ?? '', stat: s.displayValue ?? '' })),
        };
      }),
    });
  }

  const playerBox = boxScore?.players as Record<string, unknown>[] | undefined;
  if (playerBox?.length) {
    playerStats.push({
      id: gameId,
      teams: playerBox.map((group) => {
        const teamInfo = group.team as SdvEspnTeam;
        const statistics = (group.statistics as Record<string, unknown>[] | undefined) ?? [];
        const categories = statistics.map((cat) => {
          const types = (cat.types as Record<string, unknown>[] | undefined) ?? [];
          return {
            name: String(cat.name ?? cat.text ?? ''),
            types: types.map((type) => {
              const athletes = (type.athletes as Record<string, unknown>[] | undefined) ?? [];
              return {
                name: String(type.name ?? type.text ?? ''),
                athletes: athletes.map((a) => {
                  const athlete = a.athlete as { id?: string; displayName?: string; fullName?: string };
                  const stats = (a.stats as string[] | undefined) ?? [];
                  return {
                    id: String(athlete?.id ?? ''),
                    name: athlete?.displayName ?? athlete?.fullName ?? '',
                    stat: stats.join(' '),
                  };
                }),
              };
            }),
          };
        });
        return {
          team: teamInfo?.location ?? teamInfo?.displayName ?? '',
          categories,
        };
      }),
    });
  }

  const advancedBoxScore: AdvancedBoxScoreData = {
    gameInfo: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: venue ? normalizeVenue(venue) : undefined,
    },
    teams: boxScore?.teams as Record<string, unknown> | undefined,
  };

  return { game, teamStats, playerStats, advancedBoxScore, venue: venue ? normalizeVenue(venue) : undefined };
}

export function mapPicksToOdds(picks: SdvCfbPicks, game: Game): {
  odds: PregameWinProbability | null;
  lines: BettingGame | null;
  media: GameMedia[];
  weather: GameWeather | null;
} {
  const oddsRaw = (picks.odds as Record<string, unknown>[] | undefined) ?? [];
  const pickcenter = (picks.pickcenter as Record<string, unknown>[] | undefined) ?? oddsRaw;
  const firstOdds = pickcenter[0] ?? oddsRaw[0];

  let spread = 0;
  let homeWinProbability = 0.5;
  if (firstOdds) {
    spread = num(firstOdds.spread) ?? 0;
    const homeOdds = firstOdds.homeTeamOdds as { winPercentage?: number } | undefined;
    if (homeOdds?.winPercentage != null) {
      homeWinProbability = homeOdds.winPercentage;
    }
  }

  const winProbArr = (picks.winProbability as { homeWinPercentage?: number }[] | undefined) ?? [];
  if (homeWinProbability === 0.5 && winProbArr[0]?.homeWinPercentage != null) {
    homeWinProbability = winProbArr[0].homeWinPercentage;
  }

  const odds: PregameWinProbability | null = firstOdds
    ? { gameId: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, spread, homeWinProbability }
    : null;

  const lines: BettingGame | null = firstOdds
    ? {
      id: game.id,
      lines: [{ spread, overUnder: num(firstOdds.overUnder) ?? 0, provider: 'ESPN' }],
    }
    : null;

  const broadcasts =
    (picks.gameInfo as { broadcasts?: { names?: string[]; type?: { shortName?: string } }[] })?.broadcasts ?? [];
  const media: GameMedia[] = broadcasts.flatMap((b) =>
    (b.names ?? []).map((name) => ({
      outlet: name,
      mediaType: b.type?.shortName ?? 'TV',
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
    }))
  );

  const weatherInfo = (picks.gameInfo as { weather?: Record<string, unknown> })?.weather;
  const weather: GameWeather | null = weatherInfo
    ? {
      gameIndoors: Boolean(weatherInfo.indoor),
      temperature: num(weatherInfo.temperature),
      humidity: num(weatherInfo.humidity),
      windSpeed: num(weatherInfo.windSpeed),
      windDirection: num(weatherInfo.windDirection),
      precipitation: num(weatherInfo.precipitation),
      snowfall: num(weatherInfo.snowfall),
      condition: { description: String(weatherInfo.displayValue ?? '') },
    }
    : null;

  return { odds, lines, media, weather };
}

export function mapLeadersToPlayerStats(leaders: Record<string, unknown>[], season: number): PlayerStat[] {
  const results: PlayerStat[] = [];
  for (const group of leaders) {
    const category = String(group.name ?? group.displayName ?? '');
    const leaderList = (group.leaders as Record<string, unknown>[] | undefined) ?? [];
    for (const leader of leaderList) {
      const athlete = leader.athlete as { id?: string; displayName?: string; position?: { abbreviation?: string } };
      const team = leader.team as SdvEspnTeam;
      results.push({
        playerId: String(athlete?.id ?? ''),
        player: athlete?.displayName ?? '',
        team: team?.location ?? team?.displayName ?? '',
        position: athlete?.position?.abbreviation ?? '',
        category,
        statType: category,
        stat: String(leader.displayValue ?? leader.value ?? ''),
        season,
      });
    }
  }
  return results;
}

export class GamesRepo {
  async getSchedule(team: string, year: number): Promise<Game[]> {
    return getTeamSchedule(team, year);
  }

  async getScheduleWithOdds(team: string, year: number): Promise<GameWithOdds[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const games = await this.getSchedule(team, year);
    if (!teamId) return games.map((g) => ({ ...g, odds: undefined }));

    try {
      const raw = await sdvRequest(async () => {
        const cfb = await getCfb();
        return (await cfb.espnCfbTeamSchedule({
          team_id: String(teamId),
          season: year,
        })) as SdvTeamScheduleResponse;
      }, { cacheKey: `scheduleRaw:${team}:${year}`, cacheTtlMs: 15 * 60 * 1000 });
      return extractOddsFromRawSchedule(raw.events ?? [], games);
    } catch (err) {
      console.warn(`Schedule odds unavailable for ${team} ${year}:`, err instanceof Error ? err.message : err);
      return games.map((g) => ({ ...g, odds: undefined }));
    }
  }

  async getGameSummaryRaw(gameId: number): Promise<SdvCfbSummaryRaw> {
    return sdvRequest(async () => {
      const cfb = await getCfb();
      return (await cfb.espnCfbSummary({ event_id: gameId })) as SdvCfbSummaryRaw;
    }, { cacheKey: `gameSummaryRaw:${gameId}`, cacheTtlMs: 60 * 60 * 1000 });
  }

  async getGameDetail(gameId: number): Promise<GameDetail> {
    const raw = await this.getGameSummaryRaw(gameId);
    return mapSummaryToGameDetail(normalizeSummary(raw, gameId));
  }

  async getGamePicks(gameId: number) {
    const raw = await this.getGameSummaryRaw(gameId);
    return summaryToPicks(raw, gameId);
  }

  async getWeekGamesFromScoreboard(
    year: number,
    week: number,
    seasontype: number = REGULAR_SEASON_TYPE
  ): Promise<Game[]> {
    const rows = await sdvRequest(async () => {
      const cfb = await getCfb();
      return (await cfb.espnCfbScoreboard({
        dates: year,
        week,
        season_type: seasontype,
        groups: FBS_GROUP,
        limit: 300,
        parsed: true,
      })) as SdvParsedScoreboardRow[];
    });
    return mapScoreboardRowsToGames(rows, week);
  }
}

export type { GameDetail, GameWithOdds };
