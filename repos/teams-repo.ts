import { findCoachAssociation } from '../lib/coaches-db';
import { FBS_GROUP } from '../lib/espn-constants';
import { getCfb, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import type {
  SdvParsedCoachRow,
  SdvParsedRosterRow,
  SdvParsedStandingsRow,
  SdvSeasonCoachEntry,
  SdvTeamResponse,
} from '../lib/espn-types';
import { mapEspnTeamToTeam } from '../lib/team-index';
import { teamIndex } from '../lib/team-index';
import type { Coach, CoachSeason, RosterPlayer, Team } from '../lib/types';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseHeight(raw: unknown): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/(\d+)-(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
}

function parseCoachRecord(teamRecord?: string): { games: number; wins: number; losses: number; ties: number } {
  const parts = (teamRecord ?? '').split('-').map((p) => parseInt(p, 10));
  const wins = Number.isFinite(parts[0]) ? parts[0] : 0;
  const losses = Number.isFinite(parts[1]) ? parts[1] : 0;
  const ties = Number.isFinite(parts[2]) ? parts[2] : 0;
  return { wins, losses, ties, games: wins + losses + ties };
}

export function mapParsedRosterRows(rows: SdvParsedRosterRow[], school: string, year: number): RosterPlayer[] {
  return rows.map((a) => ({
    id: String(a.id ?? ''),
    firstName: a.first_name ?? '',
    lastName: a.last_name ?? '',
    team: school,
    height: parseHeight(a.display_height ?? a.height),
    weight: num(a.weight),
    jersey: num(a.jersey),
    year: a.experience_years ?? year,
    position: a.position_abbreviation ?? null,
  }));
}

export function mapSeasonCoachEntry(
  entry: SdvSeasonCoachEntry,
  school: string,
  year: number,
  teamRecord?: string
): Coach[] {
  if (!entry.firstName && !entry.lastName) return [];
  const record = parseCoachRecord(teamRecord);
  return [
    {
      firstName: entry.firstName ?? '',
      lastName: entry.lastName ?? '',
      hireDate: '',
      seasons: [
        {
          school,
          year,
          games: record.games,
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
        },
      ],
    },
  ];
}

/** Extract numeric id from an ESPN Core `$ref` URL. */
export function idFromRef(ref: string | undefined | null, kind: 'athletes' | 'teams' | 'coaches'): number | null {
  if (!ref) return null;
  const re = new RegExp(`${kind}/(\\d+)`);
  const m = ref.match(re);
  return m ? Number(m[1]) : null;
}

function fetchTeam(teamId: number, options?: SdvRequestOptions): Promise<SdvTeamResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeam({ team_id: teamId })) as SdvTeamResponse;
  }, {
    cacheKey: `team:${teamId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

function fetchParsedTeamRoster(teamId: number, options?: SdvRequestOptions): Promise<SdvParsedRosterRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamRoster({ team_id: teamId, parsed: true })) as SdvParsedRosterRow[];
  }, {
    cacheKey: `teamRoster:${teamId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

function fetchParsedStandings(
  season: number,
  group = FBS_GROUP,
  options?: SdvRequestOptions
): Promise<SdvParsedStandingsRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group, parsed: true })) as SdvParsedStandingsRow[];
  }, options);
}

function fetchSeasonCoachRefs(season: number, options?: SdvRequestOptions) {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return cfb.espnCfbSeasonCoaches({ season, limit: 500 });
  }, options);
}

function fetchCoach(coachId: number | string, options?: SdvRequestOptions): Promise<SdvParsedCoachRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbCoach({ coach_id: coachId, parsed: true })) as SdvParsedCoachRow[];
  }, options);
}

function fetchCoachRecord(
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
async function fetchTeamCoachEntry(
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

function parseJsonRefs(value: unknown): Array<{ '$ref'?: string }> {
  if (Array.isArray(value)) return value as Array<{ '$ref'?: string }>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export class TeamsRepo {
  async getTeamInfo(teamIdOrSchool: string, year: number): Promise<Team | null> {
    const team = await teamIndex.resolveTeam(teamIdOrSchool, year);
    if (!team) return null;

    try {
      const response = await fetchTeam(team.id);
      if (response.team) {
        return mapEspnTeamToTeam(response.team, team.conference);
      }
    } catch (err) {
      console.warn(`getTeamInfo upstream failed for ${teamIdOrSchool}:`, err instanceof Error ? err.message : err);
    }
    return team;
  }

  async getRoster(team: string, year: number): Promise<RosterPlayer[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    if (!teamId) return [];

    const rows = await fetchParsedTeamRoster(teamId);
    return mapParsedRosterRows(rows, school, year);
  }

  async getCoaches(team: string, year: number): Promise<Coach[]> {
    const teamId = await teamIndex.resolveTeamId(team, year);
    const school = (await teamIndex.resolveSchoolName(team, year)) ?? team;
    if (!teamId) return [];

    try {
      const teamResponse = await fetchTeam(teamId).catch(() => null);
      let recordSummary = teamResponse?.team?.record?.items?.[0]?.summary;
      if (!recordSummary) {
        const rows = await fetchParsedStandings(year, FBS_GROUP, {
          cacheKey: `coachStandings:${year}`,
          cacheTtlMs: 60 * 60 * 1000,
        }).catch(() => [] as SdvParsedStandingsRow[]);
        recordSummary = rows.find((r) => Number(r.team_id) === teamId)?.overall;
      }

      // Prefer durable lowdb association (season row, else current coach fallback).
      const assoc = await findCoachAssociation(teamId, year).catch((err) => {
        console.warn(`coaches-db lookup failed for ${teamId}:`, err instanceof Error ? err.message : err);
        return null;
      });
      if (assoc?.row) {
        const coachEntry: SdvSeasonCoachEntry = {
          id: assoc.row.coachId,
          firstName: assoc.row.firstName,
          lastName: assoc.row.lastName,
          team: {
            '$ref': `http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams/${teamId}`,
          },
        };
        const base = mapSeasonCoachEntry(coachEntry, school, year, recordSummary);
        if (!base[0]) return [];
        return [await this.enrichCoachTenure(base[0], assoc.row.coachId, teamId, school, year)];
      }

      // Live ESPN fallback when lowdb has no association yet.
      const coachEntry = await fetchTeamCoachEntry(teamId, year);
      if (!coachEntry) return [];

      const base = mapSeasonCoachEntry(coachEntry, school, year, recordSummary);
      if (!base[0] || !coachEntry.id) return base;

      return [await this.enrichCoachTenure(base[0], String(coachEntry.id), teamId, school, year)];
    } catch (err) {
      console.warn(`getCoaches failed for ${team}:`, err instanceof Error ? err.message : err);
    }
    return [];
  }

  /** Resolve coach_seasons refs and keep only seasons for this school. */
  private async enrichCoachTenure(
    coach: Coach,
    coachId: string,
    teamId: number,
    school: string,
    year: number
  ): Promise<Coach> {
    try {
      const [rows, careerRows] = await Promise.all([
        fetchCoach(coachId),
        fetchCoachRecord(coachId, 0).catch(() => []),
      ]);
      const row = rows[0];
      const careerSummary =
        (careerRows[0]?.summary as string | undefined) ??
        (careerRows[0]?.display_value as string | undefined) ??
        undefined;

      const seasonRefs = parseJsonRefs(row?.coach_seasons);
      const schoolSeasons: CoachSeason[] = [];
      let partialTenure = false;

      // Cap ref walks to keep response time reasonable.
      for (const item of seasonRefs.slice(0, 20)) {
        const ref = item['$ref'];
        if (!ref) continue;
        const seasonMatch = ref.match(/seasons\/(\d+)\//);
        const seasonYear = seasonMatch ? Number(seasonMatch[1]) : NaN;
        if (!Number.isFinite(seasonYear)) continue;
        try {
          const axios = (await import('axios')).default;
          const url = ref.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');
          const res = await axios.get(url, { timeout: 8_000 });
          const data = res.data as {
            team?: { '$ref'?: string };
            records?: Array<{ record?: { '$ref'?: string } }>;
          };
          const seasonTeamId = idFromRef(data.team?.['$ref'], 'teams');
          if (seasonTeamId !== teamId) continue;

          let wins = 0;
          let losses = 0;
          let ties = 0;
          let games = 0;
          const recordRef = data.records?.[0]?.record?.['$ref'];
          if (recordRef) {
            try {
              const recRes = await axios.get(
                recordRef.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com'),
                { timeout: 8_000 }
              );
              const summary = String(recRes.data?.summary ?? recRes.data?.displayValue ?? '');
              const m = summary.match(/(\d+)-(\d+)(?:-(\d+))?/);
              if (m) {
                wins = Number(m[1]);
                losses = Number(m[2]);
                ties = Number(m[3] ?? 0);
                games = wins + losses + ties;
              }
            } catch {
              partialTenure = true;
            }
          } else {
            partialTenure = true;
          }

          schoolSeasons.push({ school, year: seasonYear, games, wins, losses, ties });
        } catch {
          partialTenure = true;
        }
      }

      const seasons =
        schoolSeasons.length > 0
          ? schoolSeasons.sort((a, b) => b.year - a.year)
          : coach.seasons;

      const schoolWins = seasons.reduce((s, x) => s + x.wins, 0);
      const schoolLosses = seasons.reduce((s, x) => s + x.losses, 0);
      const schoolTies = seasons.reduce((s, x) => s + x.ties, 0);
      const firstSeason = seasons.length ? Math.min(...seasons.map((s) => s.year)) : year;

      return {
        ...coach,
        hireDate: coach.hireDate || String(firstSeason),
        seasons,
        seasonsAtSchool: seasons.length,
        schoolRecordSummary: `${schoolWins}-${schoolLosses}${schoolTies ? `-${schoolTies}` : ''}`,
        careerRecordSummary: careerSummary,
        partialTenure: partialTenure || schoolSeasons.length === 0,
      };
    } catch (err) {
      console.warn(`Coach tenure enrich failed for ${coachId}:`, err instanceof Error ? err.message : err);
      return { ...coach, partialTenure: true };
    }
  }
}
