/**
 * Typed wrappers around sportsdataverse generated `espnCfb*` endpoints.
 *
 * @see https://github.com/sportsdataverse/sportsdataverse-js/blob/main/src/generated/espn/cfb.ts
 * @see https://js.sportsdataverse.org/docs/reference/cfb
 */
import { getCfb, getDefaultSeason, sdvRequest, type SdvRequestOptions } from './client';
import { FBS_GROUP } from './constants';
import { normalizeRankingsPayload } from './rankings';
import type {
  SdvCfbPicks,
  SdvCfbSummary,
  SdvCfbSummaryRaw,
  SdvParsedCoachRow,
  SdvParsedPowerIndexRow,
  SdvParsedRosterRow,
  SdvParsedScoreboardRow,
  SdvParsedStandingsRow,
  SdvParsedTeamScheduleRow,
  SdvSeasonCoachEntry,
  SdvStandingsResponse,
  SdvTeamResponse,
  SdvTeamScheduleResponse,
} from './types';

export type ScoreboardParams = {
  season?: number;
  week?: number;
  seasontype?: number;
  groups?: number;
  limit?: number;
};

export type TeamScheduleParams = {
  teamId: number | string;
  season: number;
};

export type SummarySection =
  | 'boxscore_player'
  | 'boxscore_team'
  | 'pickcenter'
  | 'odds'
  | 'leaders'
  | 'plays'
  | 'drive_plays'
  | 'drives'
  | 'winprobability'
  | 'game_info'
  | 'header';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Normalize `espnCfbSummary` raw JSON to the shape our mappers expect. */
export function normalizeSummary(raw: SdvCfbSummaryRaw, gameId?: number): SdvCfbSummary {
  const header = raw.header ?? {};
  const competitions = (header.competitions as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: gameId ?? num(header.id),
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
    id: gameId ?? num(header.id),
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

// ---------------------------------------------------------------------------
// Scoreboard & schedule — espnCfbScoreboard, espnCfbTeamSchedule
// ---------------------------------------------------------------------------

export function fetchParsedScoreboard(
  params: ScoreboardParams,
  options?: SdvRequestOptions
): Promise<SdvParsedScoreboardRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    const query: Record<string, unknown> = {
      groups: params.groups ?? FBS_GROUP,
      limit: params.limit ?? 300,
      parsed: true,
    };
    if (params.season != null) query.dates = params.season;
    if (params.week != null) query.week = params.week;
    if (params.seasontype != null) query.season_type = params.seasontype;
    return (await cfb.espnCfbScoreboard(query)) as SdvParsedScoreboardRow[];
  }, options);
}

export function fetchParsedTeamSchedule(
  params: TeamScheduleParams,
  options?: SdvRequestOptions
): Promise<SdvParsedTeamScheduleRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamSchedule({
      team_id: String(params.teamId),
      season: params.season,
      parsed: true,
    })) as SdvParsedTeamScheduleRow[];
  }, options);
}

export function fetchTeamScheduleRaw(
  params: TeamScheduleParams,
  options?: SdvRequestOptions
): Promise<SdvTeamScheduleResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamSchedule({
      team_id: String(params.teamId),
      season: params.season,
    })) as SdvTeamScheduleResponse;
  }, options);
}

/** @deprecated Prefer fetchParsedTeamSchedule; kept for ATS odds in nested event JSON. */
export const fetchTeamSchedule = fetchTeamScheduleRaw;

// ---------------------------------------------------------------------------
// Standings & rankings — espnCfbStandings, espnCfbRankings, espnCfbSeasonPowerindex
// ---------------------------------------------------------------------------

export function fetchParsedStandings(
  season: number,
  group = FBS_GROUP,
  options?: SdvRequestOptions
): Promise<SdvParsedStandingsRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group, parsed: true })) as SdvParsedStandingsRow[];
  }, options);
}

export function fetchRawStandings(
  season: number,
  group = FBS_GROUP,
  options?: SdvRequestOptions
): Promise<SdvStandingsResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group })) as SdvStandingsResponse;
  }, options);
}

/** @deprecated Use fetchRawStandings */
export const fetchStandings = fetchRawStandings;

export function fetchSeasonPowerIndex(
  season: number,
  options?: SdvRequestOptions
): Promise<SdvParsedPowerIndexRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbSeasonPowerindex({ season, parsed: true })) as SdvParsedPowerIndexRow[];
  }, {
    cacheKey: `seasonPowerIndex:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

export type SeasonWeekInfo = {
  week: number;
  startDate: string;
  endDate: string;
  text?: string;
  seasonType: number;
};

type SeasonWeeksList = { items?: Array<{ '$ref'?: string }> };

/** Fetch week metadata (start/end dates) for a season type via espnCfbSeasonWeeks. */
export async function fetchSeasonWeeks(
  season: number,
  seasonType: number,
  options?: SdvRequestOptions
): Promise<SeasonWeekInfo[]> {
  const list = (await sdvRequest(async () => {
    const cfb = await getCfb();
    return cfb.espnCfbSeasonWeeks({ season, season_type: seasonType }) as SeasonWeeksList;
  }, {
    cacheKey: `seasonWeeksList:${season}:${seasonType}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  })) as SeasonWeeksList;

  const weeks: SeasonWeekInfo[] = [];
  for (const item of list.items ?? []) {
    const ref = item['$ref'];
    const weekNum = ref?.match(/weeks\/(\d+)/)?.[1];
    if (!ref || !weekNum) continue;

    try {
      const detail = await sdvRequest(
        async () => {
          const axios = (await import('axios')).default;
          const res = await axios.get(ref, { timeout: 8_000 });
          return res.data as { number?: number; startDate?: string; endDate?: string; text?: string };
        },
        {
          cacheKey: `seasonWeekDetail:${season}:${seasonType}:${weekNum}`,
          cacheTtlMs: 24 * 60 * 60 * 1000,
          timeoutMs: 8_000,
        }
      );
      if (detail.startDate && detail.endDate) {
        weeks.push({
          week: detail.number ?? Number(weekNum),
          startDate: detail.startDate,
          endDate: detail.endDate,
          text: detail.text,
          seasonType,
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch week ${weekNum} for ${season}:`, err instanceof Error ? err.message : err);
    }
  }

  return weeks.sort((a, b) => a.week - b.week);
}

export function fetchParsedRankings(
  year?: number,
  options?: SdvRequestOptions
): Promise<Record<string, unknown>> {
  const defaultSeason = getDefaultSeason();
  const season = year ?? defaultSeason;
  const useLivePolls = season >= defaultSeason;

  return sdvRequest(async () => {
    const cfb = await getCfb();
    if (useLivePolls) {
      return (await cfb.espnCfbRankings({})) as Record<string, unknown>;
    }

    // Historical seasons: CDN rankings accept year (site rankings endpoint does not).
    // Legacy SDV typings mark week required; runtime treats it as optional.
    const getRankings = cfb.getRankings as (params: {
      year?: number;
      week?: number;
    }) => Promise<unknown>;
    const raw = (await getRankings({ year: season })) as Record<string, unknown>;
    return normalizeRankingsPayload(raw);
  }, {
    cacheKey: options?.cacheKey ?? `espnRankings:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 15 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

// ---------------------------------------------------------------------------
// Game detail — espnCfbSummary (+ section dispatch)
// ---------------------------------------------------------------------------

export function fetchGameSummaryRaw(gameId: number, options?: SdvRequestOptions): Promise<SdvCfbSummaryRaw> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbSummary({ event_id: gameId })) as SdvCfbSummaryRaw;
  }, {
    cacheKey: `gameSummaryRaw:${gameId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

export function fetchGameSummary(gameId: number, options?: SdvRequestOptions): Promise<SdvCfbSummary> {
  return fetchGameSummaryRaw(gameId, options).then((raw) => normalizeSummary(raw, gameId));
}

export function fetchGamePicks(gameId: number, options?: SdvRequestOptions): Promise<SdvCfbPicks> {
  return fetchGameSummaryRaw(gameId, options).then((raw) => summaryToPicks(raw, gameId));
}

export function fetchSummarySection<T = Record<string, unknown>[]>(
  gameId: number,
  section: SummarySection,
  options?: SdvRequestOptions
): Promise<T> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbSummary({ event_id: gameId, parsed: true, section })) as T;
  }, options);
}

export function fetchGameDrives(gameId: number, options?: SdvRequestOptions) {
  return fetchGameSummaryRaw(gameId, options).then((raw) => {
    const drives = raw.drives as { previous?: unknown[]; current?: unknown[] } | undefined;
    return [...(drives?.previous ?? []), ...(drives?.current ?? [])];
  });
}

export function fetchGamePlays(gameId: number, options?: SdvRequestOptions) {
  return fetchGameSummaryRaw(gameId, options).then((raw) => {
    const drives = raw.drives as { previous?: { plays?: unknown[] }[]; current?: { plays?: unknown[] }[] } | undefined;
    return [...(drives?.previous ?? []), ...(drives?.current ?? [])].flatMap((d) => d.plays ?? []);
  });
}

/** @deprecated Use fetchGameDrives / fetchGamePlays via espnCfbSummary */
export const fetchPlayByPlay = fetchGameSummaryRaw;

// ---------------------------------------------------------------------------
// Teams — espnCfbTeam, espnCfbTeamRoster, espnCfbTeamRecord
// ---------------------------------------------------------------------------

export function fetchTeam(teamId: number, options?: SdvRequestOptions): Promise<SdvTeamResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeam({ team_id: teamId })) as SdvTeamResponse;
  }, {
    cacheKey: `team:${teamId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

/** @deprecated Use fetchTeam */
export const fetchTeamInfo = fetchTeam;

export function fetchParsedTeamRoster(
  teamId: number,
  options?: SdvRequestOptions
): Promise<SdvParsedRosterRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamRoster({ team_id: teamId, parsed: true })) as SdvParsedRosterRow[];
  }, {
    cacheKey: `teamRoster:${teamId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

/** @deprecated Use fetchParsedTeamRoster */
export function fetchTeamPlayers(teamId: number, options?: SdvRequestOptions): Promise<SdvParsedRosterRow[]> {
  return fetchParsedTeamRoster(teamId, options);
}

// ---------------------------------------------------------------------------
// Coaches — espnCfbSeasonCoaches, espnCfbCoach, espnCfbCoachRecord
// ---------------------------------------------------------------------------

export function fetchSeasonCoachRefs(season: number, options?: SdvRequestOptions) {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return cfb.espnCfbSeasonCoaches({ season, limit: 500 });
  }, options);
}

export function fetchCoach(coachId: number | string, options?: SdvRequestOptions): Promise<SdvParsedCoachRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbCoach({ coach_id: coachId, parsed: true })) as SdvParsedCoachRow[];
  }, options);
}

export function fetchCoachRecord(
  coachId: number | string,
  recordType = 0,
  options?: SdvRequestOptions
): Promise<Record<string, unknown>[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbCoachRecord({
      coach_id: coachId,
      record_type: recordType,
      parsed: true,
    })) as Record<string, unknown>[];
  }, options);
}

type SeasonCoachList = { items?: Array<{ '$ref'?: string }> };

const teamCoachBySeason = new Map<number, Map<number, SdvSeasonCoachEntry>>();
const teamCoachEntryCache = new Map<string, SdvSeasonCoachEntry | null>();

/** Resolve head coach via team endpoint first, then season coach refs. Cached per team/season. */
export async function fetchTeamCoachEntry(
  teamId: number,
  season: number,
  options?: SdvRequestOptions
): Promise<SdvSeasonCoachEntry | null> {
  const resultCacheKey = `teamCoachEntry:${teamId}:${season}`;
  if (teamCoachEntryCache.has(resultCacheKey)) {
    return teamCoachEntryCache.get(resultCacheKey) ?? null;
  }

  const indexHit = teamCoachBySeason.get(season)?.get(teamId);
  if (indexHit) {
    teamCoachEntryCache.set(resultCacheKey, indexHit);
    return indexHit;
  }

  // Prefer coach fragment on the team response (avoids walking 130+ coach refs).
  try {
    const teamResponse = await fetchTeam(teamId, options);
    const coach = teamResponse.team?.coach;
    if (coach?.firstName || coach?.lastName) {
      const entry: SdvSeasonCoachEntry = {
        firstName: coach.firstName,
        lastName: coach.lastName,
        team: { '$ref': `http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams/${teamId}` },
      };
      let index = teamCoachBySeason.get(season);
      if (!index) {
        index = new Map();
        teamCoachBySeason.set(season, index);
      }
      index.set(teamId, entry);
      teamCoachEntryCache.set(resultCacheKey, entry);
      return entry;
    }
  } catch (err) {
    console.warn(`Team coach lookup failed for ${teamId}:`, err instanceof Error ? err.message : err);
  }

  const list = (await fetchSeasonCoachRefs(season, {
    ...options,
    cacheKey: `seasonCoaches:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 24 * 60 * 60 * 1000,
  })) as SeasonCoachList;

  let index = teamCoachBySeason.get(season);
  if (!index) {
    index = new Map();
    teamCoachBySeason.set(season, index);
  }

  for (const item of list.items ?? []) {
    const ref = item['$ref'];
    const coachId = ref?.match(/coaches\/(\d+)/)?.[1];
    if (!ref || !coachId) continue;

    const entry = await sdvRequest(
      async () => {
        const axios = (await import('axios')).default;
        const res = await axios.get(ref, { timeout: 8_000 });
        return res.data as SdvSeasonCoachEntry;
      },
      { cacheKey: `seasonCoachEntry:${season}:${coachId}`, cacheTtlMs: 24 * 60 * 60 * 1000, timeoutMs: 8_000 }
    );
    const teamRef = entry.team?.['$ref'] ?? '';
    const matchedTeamId = teamRef.match(/teams\/(\d+)/)?.[1];
    if (!matchedTeamId) continue;

    const matchedId = Number(matchedTeamId);
    index.set(matchedId, entry);
    teamCoachEntryCache.set(`teamCoachEntry:${matchedId}:${season}`, entry);

    if (matchedId === teamId) {
      return entry;
    }
  }

  teamCoachEntryCache.set(resultCacheKey, null);
  return null;
}
