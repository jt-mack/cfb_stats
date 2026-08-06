import {
  FBS_CONFERENCES,
  FBS_CONFERENCE_BY_ABBR,
  FBS_GROUP,
} from '../lib/espn-constants';
import { getCfb, sdvRequest } from '../lib/espn-client';
import type {
  SdvEspnTeam,
  SdvParsedStandingsRow,
  SdvStandingsEntry,
  SdvStandingsResponse,
} from '../lib/espn-types';
import { mapEspnTeamToTeam, resolveTeamLogos } from '../lib/team-index';
import type { Conference, Team, TeamRecords } from '../lib/types';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseRecord(displayValue: string | undefined): { wins: number; losses: number; ties: number; games: number } {
  if (!displayValue) return { wins: 0, losses: 0, ties: 0, games: 0 };
  const parts = displayValue.split('-').map((p) => parseInt(p, 10));
  const wins = parts[0] ?? 0;
  const losses = parts[1] ?? 0;
  const ties = parts[2] ?? 0;
  return { wins, losses, ties, games: wins + losses + ties };
}

export function listFbsConferences(): Conference[] {
  return FBS_CONFERENCES.filter((c) => c.id !== 80 && c.id < 80).map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    abbreviation: c.abbreviation,
    classification: 'fbs',
  }));
}

export function resolveConferenceMeta(conferenceAbbr: string) {
  const lower = conferenceAbbr.toLowerCase();
  return (
    FBS_CONFERENCE_BY_ABBR.get(lower) ??
    listFbsConferences().find(
      (c) =>
        c.abbreviation?.toLowerCase() === lower ||
        c.shortName?.toLowerCase() === lower ||
        c.name.toLowerCase() === lower ||
        String(c.id) === conferenceAbbr
    ) ??
    null
  );
}

export function mapParsedStandingsToTeam(row: SdvParsedStandingsRow, conference: string): Team {
  return mapEspnTeamToTeam(
    {
      id: row.team_id,
      location: row.team_location,
      name: row.team_name,
      displayName: row.team_display_name,
      abbreviation: row.team_abbreviation,
      logos: resolveTeamLogos(row.team_id, undefined, row.team_logo)?.map((href) => ({ href })),
    },
    conference
  );
}

export function mapParsedStandingsToRecord(
  row: SdvParsedStandingsRow,
  year: number,
  conference: string
): TeamRecords {
  // SDV's parsed standings store `stat.value`, but overall / vs. Conf. records only
  // have `displayValue` (e.g. "11-3"). Prefer string W-L fields; never invent losses
  // from a bare wins count (that mislabels conference wins as overall).
  const overall =
    typeof row.overall === 'string' && row.overall.includes('-')
      ? row.overall
      : undefined;
  const vsConf =
    typeof row.vs_conf === 'string' && row.vs_conf.includes('-')
      ? row.vs_conf
      : undefined;

  return {
    year,
    teamId: num(row.team_id) ?? 0,
    team: row.team_location ?? row.team_display_name ?? '',
    conference,
    total: parseRecord(overall),
    conferenceGames: parseRecord(vsConf),
  };
}

/** Flatten ESPN standings entries from a possibly nested children payload. */
export function extractStandingsEntries(raw: SdvStandingsResponse | null | undefined): SdvStandingsEntry[] {
  if (!raw) return [];
  const entries: SdvStandingsEntry[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as SdvStandingsResponse & { children?: unknown[] };
    const list = n.standings?.entries;
    if (Array.isArray(list)) entries.push(...list);
    for (const child of n.children ?? []) walk(child);
  };

  if (Array.isArray(raw.children) && raw.children.length) {
    for (const child of raw.children) walk(child);
  } else {
    walk(raw);
  }

  return entries;
}

export function mapStandingsEntryToRecord(
  entry: SdvStandingsEntry,
  year: number,
  conference: string
): TeamRecords {
  const team = entry.team as SdvEspnTeam;
  const stats = entry.stats ?? [];
  const overall = stats.find((s) => s.type === 'total');
  const conf = stats.find((s) => s.type === 'vsconf');
  return {
    year,
    teamId: num(team?.id) ?? 0,
    team: team?.location ?? team?.displayName ?? '',
    conference,
    total: parseRecord(overall?.displayValue),
    conferenceGames: parseRecord(conf?.displayValue),
  };
}

async function fetchParsedStandings(
  season: number,
  group = FBS_GROUP,
  options?: { cacheKey?: string; cacheTtlMs?: number }
): Promise<SdvParsedStandingsRow[]> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group, parsed: true })) as SdvParsedStandingsRow[];
  }, options);
}

async function fetchRawStandings(
  season: number,
  group = FBS_GROUP,
  options?: { cacheKey?: string; cacheTtlMs?: number }
): Promise<SdvStandingsResponse> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group })) as SdvStandingsResponse;
  }, options);
}

export class ConferencesRepo {
  private getAllFbsConferences(): Conference[] {
    return listFbsConferences();
  }

  async getConferences(): Promise<Conference[]> {
    return this.getAllFbsConferences();
  }

  async resolveConferenceAbbr(conferenceId: string): Promise<string | null> {
    const meta = resolveConferenceMeta(conferenceId);
    return meta?.abbreviation ?? meta?.shortName ?? conferenceId;
  }

  async getTeamsByConference(conferenceAbbr: string, year: number): Promise<Team[]> {
    const conf = resolveConferenceMeta(conferenceAbbr);
    if (!conf) return [];

    const rows = await fetchParsedStandings(year, conf.id, {
      cacheKey: `standingsParsed:${year}:${conf.id}`,
      cacheTtlMs: 60 * 60 * 1000,
    });
    const conference = conf.abbreviation ?? conf.shortName ?? conf.name;
    return rows.map((r) => mapParsedStandingsToTeam(r, conference));
  }

  async getConferenceRecords(conferenceAbbr: string, year: number): Promise<TeamRecords[]> {
    const conf = resolveConferenceMeta(conferenceAbbr);
    if (!conf) return [];

    // Use raw standings so overall / vs. Conf. come from displayValue ("11-3"),
    // not SDV parsed numeric values (which drop W-L strings and overwrite wins).
    const raw = await fetchRawStandings(year, conf.id, {
      cacheKey: `confRecordsRaw:${year}:${conf.id}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    const conference = conf.abbreviation ?? conf.shortName ?? conf.name;
    return extractStandingsEntries(raw).map((entry) =>
      mapStandingsEntryToRecord(entry, year, conference)
    );
  }

  /** FBS-wide standings — not an official national ranking. */
  async getFbsRecords(year: number): Promise<TeamRecords[]> {
    const raw = await fetchRawStandings(year, FBS_GROUP, {
      cacheKey: `fbsRecordsRaw:${year}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    return extractStandingsEntries(raw).map((entry) =>
      mapStandingsEntryToRecord(entry, year, 'FBS')
    );
  }
}
