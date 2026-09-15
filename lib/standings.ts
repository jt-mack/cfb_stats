import type { SdvEspnTeam, SdvStandingsEntry, SdvStandingsResponse } from './espn-types';
import type { TeamRecords } from './types';
import { num, parseWlRecord } from '../utils/parse';

export type StandingsRow = {
  entry: SdvStandingsEntry;
  conference: string;
};

/** Flatten ESPN standings entries from a possibly nested children payload. */
export function extractStandingsRows(
  raw: SdvStandingsResponse | null | undefined,
  parentConference = 'FBS'
): StandingsRow[] {
  if (!raw) return [];
  const rows: StandingsRow[] = [];

  const walk = (node: unknown, conference: string): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as SdvStandingsResponse & { children?: unknown[]; name?: string; abbreviation?: string };
    const label = n.abbreviation ?? n.shortName ?? n.name ?? conference;
    const list = n.standings?.entries;
    if (Array.isArray(list)) {
      for (const entry of list) rows.push({ entry, conference: String(label) });
    }
    for (const child of n.children ?? []) walk(child, String(label));
  };

  if (Array.isArray(raw.children) && raw.children.length) {
    for (const child of raw.children) walk(child, parentConference);
  } else {
    walk(raw, parentConference);
  }

  return rows;
}

export function extractStandingsEntries(
  raw: SdvStandingsResponse | null | undefined
): SdvStandingsEntry[] {
  return extractStandingsRows(raw).map((r) => r.entry);
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
    total: parseWlRecord(overall?.displayValue),
    conferenceGames: parseWlRecord(conf?.displayValue),
    logo: team?.logo ?? team?.logos?.[0]?.href ?? null,
  };
}
