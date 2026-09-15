/**
 * ESPN call surface used by this app.
 *
 * Services should call these helpers instead of `getCfb()` / inline axios.
 * Each function is one SportsDataverse wrapper (or one direct GET).
 */
import { getCfb, getSdv, sdvRequest, type SdvRequestOptions } from './espn-client';
import { FBS_GROUP } from './espn-constants';
import type {
  SdvCfbSummaryRaw,
  SdvParsedPowerIndexRow,
  SdvParsedRosterRow,
  SdvSeasonInfo,
  SdvSeasonTeam,
  SdvStandingsResponse,
  SdvTeamResponse,
  SdvTeamScheduleResponse,
} from './espn-types';

export type { SdvRequestOptions };

function publicEspnUrl(url: string): string {
  return url.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');
}

type Cfb = Awaited<ReturnType<typeof getCfb>>;

async function callCfb<T>(
  fn: (cfb: Cfb) => Promise<unknown>,
  options?: SdvRequestOptions
): Promise<T> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await fn(cfb)) as T;
  }, options);
}

/** Direct GET for Core `$ref` URLs and site endpoints SDV does not wrap. */
export async function espnGet<T>(url: string, options?: SdvRequestOptions): Promise<T> {
  return sdvRequest(async () => {
    const axios = (await import('axios')).default;
    const res = await axios.get(publicEspnUrl(url), {
      timeout: options?.timeoutMs ?? 8_000,
    });
    return res.data as T;
  }, options);
}

export type ScoreboardParams = {
  dates?: number;
  week?: number;
  seasonType?: number;
  groups?: number;
  limit?: number;
};

/** Site scoreboard — live or by season/week. */
export function scoreboard(params: ScoreboardParams = {}, options?: SdvRequestOptions) {
  return callCfb<SdvTeamScheduleResponse>((cfb) => {
    const query: Record<string, unknown> = {
      groups: params.groups ?? FBS_GROUP,
      limit: params.limit ?? 300,
    };
    if (params.dates != null) query.dates = params.dates;
    if (params.week != null) query.week = params.week;
    if (params.seasonType != null) query.season_type = params.seasonType;
    return cfb.espnCfbScoreboard(query);
  }, options);
}

/** Team schedule for a season. */
export function teamSchedule(
  params: { teamId: number | string; season: number },
  options?: SdvRequestOptions
) {
  return callCfb<SdvTeamScheduleResponse>(
    (cfb) =>
      cfb.espnCfbTeamSchedule({
        team_id: String(params.teamId),
        season: params.season,
      }),
    options
  );
}

/** Standings for a conference group (default FBS). */
export function standings(
  params: { season: number; group?: number },
  options?: SdvRequestOptions
) {
  return callCfb<SdvStandingsResponse>(
    (cfb) =>
      cfb.espnCfbStandings({
        season: params.season,
        group: params.group ?? FBS_GROUP,
      }),
    options
  );
}

/** Full game package (box, leaders, odds, drives). */
export function summary(eventId: number, options?: SdvRequestOptions) {
  return callCfb<SdvCfbSummaryRaw>(
    (cfb) => cfb.espnCfbSummary({ event_id: eventId }),
    options
  );
}

/** Single team hub (current-season overlay — no season param). */
export function team(teamId: number, options?: SdvRequestOptions) {
  return callCfb<SdvTeamResponse>((cfb) => cfb.espnCfbTeam({ team_id: teamId }), options);
}

/** Core season-scoped team identity. Follow `$ref`s on the document for record/ranks/coaches. */
export async function seasonTeam(
  params: { teamId: number; season: number },
  options?: SdvRequestOptions
): Promise<SdvSeasonTeam> {
  try {
    return await callCfb<SdvSeasonTeam>((cfb) => {
      if (typeof cfb.espnCfbSeasonTeam !== 'function') {
        throw new Error('NO_SDV_SEASON_TEAM');
      }
      return cfb.espnCfbSeasonTeam({
        team_id: String(params.teamId),
        season: params.season,
      });
    }, options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'NO_SDV_SEASON_TEAM' || /is not a function/i.test(msg)) {
      return espnGet<SdvSeasonTeam>(SEASON_TEAM_URL(params.season, params.teamId), options);
    }
    throw err;
  }
}

/** Team roster. */
export function teamRoster(teamId: number, options?: SdvRequestOptions) {
  return callCfb<SdvParsedRosterRow[]>(
    (cfb) => cfb.espnCfbTeamRoster({ team_id: teamId, parsed: true }),
    options
  );
}

/** League news. */
export function news(limit = 25, options?: SdvRequestOptions) {
  return callCfb<Record<string, unknown>[]>(
    (cfb) => cfb.espnCfbNews({ limit, parsed: true }),
    options
  );
}

/** Team news. */
export function teamNews(teamId: number | string, limit = 15, options?: SdvRequestOptions) {
  return callCfb<Record<string, unknown>[]>(async (cfb) => {
    const rows = await cfb.espnCfbTeamNews({ team_id: teamId, limit, parsed: true });
    return Array.isArray(rows) ? rows : [];
  }, options);
}

/** Season statistical leaders (Core). */
export function seasonTypeLeaders(
  params: { season: number; seasonType?: number },
  options?: SdvRequestOptions
) {
  return callCfb<SeasonLeadersPayload>(
    (cfb) =>
      cfb.espnCfbSeasonTypeLeaders({
        season: params.season,
        season_type: params.seasonType ?? 2,
      }),
    options
  );
}

export type SeasonLeadersPayload = {
  categories?: Array<{
    name?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    leaders?: Array<{
      displayValue?: string;
      value?: number;
      athlete?: { '$ref'?: string };
      team?: { '$ref'?: string };
    }>;
  }>;
};

/** Season FPI / efficiency rows. */
export function seasonPowerIndex(season: number, options?: SdvRequestOptions) {
  return callCfb<SdvParsedPowerIndexRow[]>(
    (cfb) => cfb.espnCfbSeasonPowerindex({ season, parsed: true }),
    options
  );
}

/** Week `$ref` list for a season type. */
export function seasonWeeks(
  params: { season: number; seasonType: number },
  options?: SdvRequestOptions
) {
  return callCfb<{ items?: Array<{ '$ref'?: string }> }>(
    (cfb) => cfb.espnCfbSeasonWeeks({ season: params.season, season_type: params.seasonType }),
    options
  );
}

/** Live polls (current season). */
export function rankings(options?: SdvRequestOptions) {
  return callCfb<Record<string, unknown>>((cfb) => cfb.espnCfbRankings({}), options);
}

/** Historical week ranking `$ref` list. */
export function seasonWeekRankings(
  params: { season: number; seasonType: number; week: number },
  options?: SdvRequestOptions
) {
  return callCfb<{ items?: Array<{ '$ref'?: string }>; count?: number }>(
    (cfb) =>
      cfb.espnCfbSeasonWeekRankings({
        season: params.season,
        season_type: params.seasonType,
        week: params.week,
      }),
    options
  );
}

/** Core season window / phase info. */
export function seasonInfo(season: number, options?: SdvRequestOptions) {
  return callCfb<SdvSeasonInfo>(
    (cfb) => cfb.espnCfbSeasonInfo({ season }),
    options
  );
}

type RecruitingFn = (params: Record<string, unknown>) => Promise<Record<string, unknown>[]>;

async function recruitingApi(): Promise<Record<string, RecruitingFn>> {
  const sdv = await getSdv();
  return sdv.recruiting as Record<string, RecruitingFn>;
}

/** 247Sports composite team recruiting rankings. */
export function recruitingComposite(year: number, options?: SdvRequestOptions) {
  return sdvRequest(async () => {
    const recruiting = await recruitingApi();
    const rows = await recruiting.sports247RankingsCompositeTeamFeed({
      sport_key: 'Football',
      year,
      page_size: 500,
      parsed: true,
    });
    return Array.isArray(rows) ? rows : [];
  }, options);
}

/** 247Sports institution talent rankings. */
export function institutionTalent(year: number, options?: SdvRequestOptions) {
  return sdvRequest(async () => {
    const recruiting = await recruitingApi();
    const rows = await recruiting.sports247InstitutionRankings({
      sport_key: 'Football',
      year,
      ranking_type: 'Talent',
      page_size: 500,
      parsed: true,
    });
    return Array.isArray(rows) ? rows : [];
  }, options);
}

export const TEAM_LEADERS_V3 = (teamId: number, season: number) =>
  `https://site.web.api.espn.com/apis/site/v3/sports/football/college-football/leaders?region=us&lang=en&limit=5&team=${teamId}&season=${season}`;

export const ATHLETE_URL = (season: number, athleteId: number) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}/athletes/${athleteId}?lang=en&region=us`;

export const TEAM_SEASON_COACHES_URL = (season: number, teamId: number) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}/teams/${teamId}/coaches`;

export const SEASON_TEAM_URL = (season: number, teamId: number) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${season}/teams/${teamId}?lang=en&region=us`;
