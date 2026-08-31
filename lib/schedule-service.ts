import { getCfb, sdvRequest, type SdvRequestOptions } from './espn-client';
import { FBS_GROUP, POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE } from './espn-constants';
import type {
  SdvEspnTeam,
  SdvParsedScoreboardRow,
  SdvParsedTeamScheduleRow,
  SdvTeamScheduleResponse,
} from './espn-types';
import { teamIndex } from './team-index';
import type { Game, Venue } from './types';
import { normalizeVenue } from '../utils/format';

const REGULAR_WEEKS = 15;
const POSTSEASON_WEEKS = 4;
const SCOREBOARD_FALLBACK_CHUNK = 4;

type ScoreboardParams = {
  season?: number;
  week?: number;
  seasontype?: number;
  groups?: number;
  limit?: number;
};

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** ESPN summary linescores use `displayValue`; some schedule payloads use `value`. */
function mapLineScores(
  linescores: { value?: number | string; displayValue?: string }[] | undefined
): number[] | null {
  if (!linescores?.length) return null;
  return linescores.map((l) => {
    const fromValue = num(l.value);
    if (fromValue != null) return fromValue;
    const fromDisplay = num(l.displayValue);
    return fromDisplay ?? 0;
  });
}

export function mapParsedScoreboardRow(row: SdvParsedScoreboardRow, week = 0): Game {
  const homeScore = num(row.home_score);
  const awayScore = num(row.away_score);
  const completed = Boolean(row.status_type_completed) || row.status_type_state === 'post';
  return {
    id: num(row.game_id) ?? 0,
    season: row.season_year ?? new Date().getFullYear(),
    week,
    startDate: row.date ?? '',
    completed,
    neutralSite: Boolean(row.neutral_site),
    conferenceGame: Boolean(row.conference_competition),
    venue: {
      id: num(row.venue_id) ?? null,
      name: row.venue_full_name ?? '',
      address: {
        city: row.venue_city ?? '',
        state: row.venue_state ?? '',
      },
      images: [],
      indoor: Boolean(row.venue_indoor),
    },
    homeTeam: row.home_location ?? row.home_display_name ?? '',
    awayTeam: row.away_location ?? row.away_display_name ?? '',
    homeTeamId: num(row.home_id),
    awayTeamId: num(row.away_id),
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: null,
    awayLineScores: null,
    status: row.status_type_description,
  };
}

export function mapParsedTeamScheduleRow(row: SdvParsedTeamScheduleRow): Game {
  let comp: Record<string, unknown> | undefined;
  try {
    const competitions = JSON.parse(row.competitions ?? '[]') as Record<string, unknown>[];
    comp = competitions[0];
  } catch {
    comp = undefined;
  }

  const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeTeam = home?.team as string | SdvEspnTeam | undefined;
  const awayTeam = away?.team as string | SdvEspnTeam | undefined;
  const homeScore = num((home?.score as { value?: unknown })?.value ?? home?.score);
  const awayScore = num((away?.score as { value?: unknown })?.value ?? away?.score);
  const status = comp?.status as { type?: { completed?: boolean; description?: string; state?: string } } | undefined;
  const completed =
    Boolean(status?.type?.completed) || status?.type?.state === 'post';

  const homeName =
    typeof homeTeam === 'string' ? homeTeam : homeTeam?.location ?? homeTeam?.displayName ?? '';
  const awayName =
    typeof awayTeam === 'string' ? awayTeam : awayTeam?.location ?? awayTeam?.displayName ?? '';

  return {
    id: num(row.id) ?? 0,
    season: row.season_year ?? new Date().getFullYear(),
    week: row.week_number ?? 0,
    startDate: row.date ?? String(comp?.date ?? ''),
    completed,
    neutralSite: Boolean(comp?.neutralSite),
    conferenceGame: Boolean(comp?.conferenceCompetition),
    venue: (comp?.venue as Venue | undefined) ?? null,
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamId: typeof homeTeam === 'object' ? num(homeTeam?.id) : null,
    awayTeamId: typeof awayTeam === 'object' ? num(awayTeam?.id) : null,
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: mapLineScores(
      home?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    awayLineScores: mapLineScores(
      away?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    status: status?.type?.description,
  };
}

export function mapScheduleEvent(event: Record<string, unknown>, season: number): Game {
  const comp = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
  const competitors = (comp?.competitors as Record<string, unknown>[] | undefined) ?? [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  const homeTeam = home?.team as SdvEspnTeam | undefined;
  const awayTeam = away?.team as SdvEspnTeam | undefined;
  const homeScore = num((home?.score as { value?: unknown })?.value ?? home?.score);
  const awayScore = num((away?.score as { value?: unknown })?.value ?? away?.score);
  const status = comp?.status as { type?: { completed?: boolean; description?: string } } | undefined;
  const weekObj = event.week as { number?: number } | undefined;
  const venueNormalized = event?.venue as Record<string, unknown> | undefined;
  const venue = venueNormalized ? normalizeVenue(venueNormalized) : undefined;
  return {
    id: num(event.id) ?? 0,
    season,
    week: weekObj?.number ?? num(comp?.week) ?? 0,
    startDate: String(event.date ?? comp?.date ?? ''),
    completed: Boolean(status?.type?.completed),
    neutralSite: Boolean(comp?.neutralSite),
    conferenceGame: Boolean(comp?.conferenceCompetition),
    venue,
    homeTeam: homeTeam?.location ?? homeTeam?.displayName ?? '',
    awayTeam: awayTeam?.location ?? awayTeam?.displayName ?? '',
    homeTeamId: num(homeTeam?.id),
    awayTeamId: num(awayTeam?.id),
    homePoints: homeScore,
    awayPoints: awayScore,
    homeLineScores: mapLineScores(
      home?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    awayLineScores: mapLineScores(
      away?.linescores as { value?: number | string; displayValue?: string }[] | undefined
    ),
    status: status?.type?.description,
  };
}

export function mapScoreboardRowsToGames(rows: SdvParsedScoreboardRow[], week: number): Game[] {
  return rows.map((r) => mapParsedScoreboardRow(r, week));
}

async function fetchParsedScoreboard(
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

async function fetchParsedTeamSchedule(
  teamId: number | string,
  season: number,
  options?: SdvRequestOptions
): Promise<SdvParsedTeamScheduleRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamSchedule({
      team_id: String(teamId),
      season,
      parsed: true,
    })) as SdvParsedTeamScheduleRow[];
  }, options);
}

async function fetchTeamScheduleRaw(
  teamId: number | string,
  season: number,
  options?: SdvRequestOptions
): Promise<SdvTeamScheduleResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamSchedule({
      team_id: String(teamId),
      season,
    })) as SdvTeamScheduleResponse;
  }, options);
}

function teamInRow(row: SdvParsedScoreboardRow, teamId: number, school: string): boolean {
  const homeId = Number(row.home_id);
  const awayId = Number(row.away_id);
  if (homeId === teamId || awayId === teamId) return true;
  const schoolLower = school.toLowerCase();
  return (
    row.home_location?.toLowerCase() === schoolLower ||
    row.away_location?.toLowerCase() === schoolLower
  );
}

export async function buildTeamScheduleFromScoreboard(
  teamId: number,
  school: string,
  year: number
): Promise<Game[]> {
  const games: Game[] = [];
  const seen = new Set<number>();

  const weekPlans: { week: number; seasontype: number }[] = [
    ...Array.from({ length: REGULAR_WEEKS }, (_, i) => ({ week: i + 1, seasontype: REGULAR_SEASON_TYPE })),
    ...Array.from({ length: POSTSEASON_WEEKS }, (_, i) => ({ week: i + 1, seasontype: POSTSEASON_SEASON_TYPE })),
  ];

  for (let i = 0; i < weekPlans.length; i += SCOREBOARD_FALLBACK_CHUNK) {
    const chunk = weekPlans.slice(i, i + SCOREBOARD_FALLBACK_CHUNK);
    const chunkRows = await Promise.all(
      chunk.map(async ({ week, seasontype }) => {
        try {
          return {
            week,
            rows: await fetchParsedScoreboard(
              { season: year, week, seasontype, groups: FBS_GROUP, limit: 300 },
              { cacheKey: `weekSb:${year}:${seasontype}:${week}`, cacheTtlMs: 15 * 60 * 1000 }
            ),
          };
        } catch {
          return { week, rows: [] as SdvParsedScoreboardRow[] };
        }
      })
    );

    for (const { week, rows } of chunkRows) {
      for (const row of rows) {
        if (!teamInRow(row, teamId, school)) continue;
        const gameId = Number(row.game_id);
        if (!gameId || seen.has(gameId)) continue;
        seen.add(gameId);
        games.push(mapParsedScoreboardRow(row, week));
      }
    }
  }

  return games.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getTeamSchedule(team: string, year: number): Promise<Game[]> {
  const meta = await teamIndex.resolveTeamMeta(team, year);
  if (!meta) return [];

  const { id: teamId, school } = meta;

  try {
    const parsed = await fetchParsedTeamSchedule(teamId, year, {
      cacheKey: `scheduleParsed:${team}:${year}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    if (parsed.length > 0) {
      return parsed.map(mapParsedTeamScheduleRow);
    }

    const raw = await fetchTeamScheduleRaw(teamId, year, {
      cacheKey: `scheduleRaw:${team}:${year}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    const events = raw.events ?? [];
    if (events.length > 0) {
      return events.map((e) => mapScheduleEvent(e, year));
    }
  } catch {
    // fall through to scoreboard builder
  }

  console.warn(`Schedule scoreboard fallback for ${school} (${teamId}) ${year}`);
  return buildTeamScheduleFromScoreboard(teamId, school, year);
}
