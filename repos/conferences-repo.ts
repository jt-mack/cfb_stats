import {
  fetchParsedStandings,
  fetchRawStandings,
  listFbsConferences,
  mapStandingsEntryToRecord,
  mapParsedStandingsToTeam,
  extractStandingsEntries,
  resolveConferenceMeta,
} from '../lib/sdv';
import type { Conference, Team, TeamRecords } from '../lib/types';

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
}
