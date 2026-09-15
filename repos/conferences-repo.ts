import {
  FBS_CONFERENCES,
  FBS_CONFERENCE_BY_ABBR,
} from '../lib/espn-constants';
import { standings as fetchStandings } from '../lib/espn';
import { extractStandingsRows, mapStandingsEntryToRecord } from '../lib/standings';
import { mapEspnTeamToTeam } from '../lib/team-index';
import type { Conference, Team, TeamRecords } from '../lib/types';

export { extractStandingsEntries, extractStandingsRows, mapStandingsEntryToRecord } from '../lib/standings';

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

export class ConferencesRepo {
  async getConferences(): Promise<Conference[]> {
    return listFbsConferences();
  }

  async resolveConferenceAbbr(conferenceId: string): Promise<string | null> {
    const meta = resolveConferenceMeta(conferenceId);
    return meta?.abbreviation ?? meta?.shortName ?? conferenceId;
  }

  async getTeamsByConference(conferenceAbbr: string, year: number): Promise<Team[]> {
    const conf = resolveConferenceMeta(conferenceAbbr);
    if (!conf) return [];

    const raw = await fetchStandings(
      { season: year, group: conf.id },
      { cacheKey: `confStandings:${year}:${conf.id}`, cacheTtlMs: 60 * 60 * 1000 }
    );
    const conference = conf.abbreviation ?? conf.shortName ?? conf.name;
    return extractStandingsRows(raw, conference)
      .map(({ entry }) => (entry.team ? mapEspnTeamToTeam(entry.team, conference) : null))
      .filter(Boolean) as Team[];
  }

  async getConferenceRecords(conferenceAbbr: string, year: number): Promise<TeamRecords[]> {
    const conf = resolveConferenceMeta(conferenceAbbr);
    if (!conf) return [];

    const raw = await fetchStandings(
      { season: year, group: conf.id },
      { cacheKey: `confRecords:${year}:${conf.id}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    const conference = conf.abbreviation ?? conf.shortName ?? conf.name;
    return extractStandingsRows(raw, conference).map(({ entry }) =>
      mapStandingsEntryToRecord(entry, year, conference)
    );
  }

  /** FBS-wide standings — not an official national ranking. */
  async getFbsRecords(year: number): Promise<TeamRecords[]> {
    const raw = await fetchStandings(
      { season: year },
      { cacheKey: `fbsRecords:${year}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    return extractStandingsRows(raw).map(({ entry, conference }) =>
      mapStandingsEntryToRecord(entry, year, conference)
    );
  }
}
