import {
  fetchParsedStandings,
  getDefaultSeason,
  listFbsConferences,
  MAIN_CONFERENCE_IDS,
  mapParsedStandingsToRecord,
  mapParsedStandingsToTeam,
  resolveConferenceMeta,
} from '../lib/sdv';
import type { Conference, Team, TeamRecords } from '../lib/types';

export class ConferencesRepo {
  private getAllFbsConferences(): Conference[] {
    return listFbsConferences();
  }

  async getConferences(): Promise<Conference[]> {
    return this.getAllFbsConferences().filter((c) => MAIN_CONFERENCE_IDS.has(c.id));
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

    const rows = await fetchParsedStandings(year, conf.id, {
      cacheKey: `confRecordsParsed:${year}:${conf.id}`,
      cacheTtlMs: 15 * 60 * 1000,
    });
    const conference = conf.abbreviation ?? conf.shortName ?? conf.name;
    return rows.map((r) => mapParsedStandingsToRecord(r, year, conference));
  }
}
