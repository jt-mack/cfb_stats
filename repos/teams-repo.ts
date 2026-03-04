import { getFbsTeams, getRoster, getCoaches } from 'cfbd';
import type { Team, GetFbsTeamsResponse } from 'cfbd';
import { unwrap } from '../lib/cfbd-client';

export class TeamsRepo {
  /**
   * Get a single team by id (number) or school name.
   * Fetches FBS teams for the year and returns the match.
   */
  async getTeamInfo(teamIdOrSchool: string, year: number): Promise<Team | null> {
    const teams = await unwrap<GetFbsTeamsResponse>(getFbsTeams({ query: { year } }));
    const idNum = Number(teamIdOrSchool);
    if (!Number.isNaN(idNum)) {
      return teams.find((t) => t.id === idNum) ?? null;
    }
    return teams.find((t) => t.school === teamIdOrSchool) ?? null;
  }

  /**
   * Get roster for a team (by school name) and year.
   */
  async getRoster(team: string, year: number) {
    return unwrap(getRoster({ query: { team, year } }));
  }

  /**
   * Get coaches for a team and year.
   */
  async getCoaches(team: string, year: number) {
    return unwrap(getCoaches({ query: { team, year } }));
  }
}
