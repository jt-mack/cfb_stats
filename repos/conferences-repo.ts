import { getConferences, getTeams, getRecords } from 'cfbd';
import type { GetConferencesResponse, GetRecordsResponse } from 'cfbd';
import { unwrap } from '../lib/cfbd-client';

export class ConferencesRepo {
  /**
   * Get all conferences (CFBD returns FBS conferences).
   */
  async getConferences(): Promise<GetConferencesResponse> {
    return unwrap<GetConferencesResponse>(getConferences({}));
  }

  /**
   * Get teams in a conference for a given year.
   * conferenceAbbr: e.g. "SEC", "B1G"
   */
  async getTeamsByConference(conferenceAbbr: string, year: number) {
    return unwrap(getTeams({ query: { conference: conferenceAbbr, year } }));
  }

  /**
   * Get conference standings/records for a conference and year.
   */
  async getConferenceRecords(conferenceAbbr: string, year: number): Promise<GetRecordsResponse> {
    return unwrap<GetRecordsResponse>(getRecords({ query: { conference: conferenceAbbr, year } }));
  }
}
