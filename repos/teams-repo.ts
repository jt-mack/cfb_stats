import {
  FBS_GROUP,
  fetchParsedStandings,
  fetchParsedTeamRoster,
  fetchTeam,
  fetchTeamCoachEntry,
  mapEspnTeamToTeam,
  mapParsedRosterRows,
  mapSeasonCoachEntry,
} from '../lib/sdv';
import { teamIndex } from '../lib/team-index';
import type { Coach, RosterPlayer, Team } from '../lib/types';

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
      const [teamResponse, coachEntry] = await Promise.all([
        fetchTeam(teamId),
        fetchTeamCoachEntry(teamId, year),
      ]);
      let recordSummary = teamResponse.team?.record?.items?.[0]?.summary;
      if (!recordSummary) {
        const rows = await fetchParsedStandings(year, FBS_GROUP, {
          cacheKey: `coachStandings:${year}`,
          cacheTtlMs: 60 * 60 * 1000,
        });
        recordSummary = rows.find((r) => Number(r.team_id) === teamId)?.overall;
      }
      if (coachEntry) {
        return mapSeasonCoachEntry(coachEntry, school, year, recordSummary);
      }
    } catch (err) {
      console.warn(`getCoaches failed for ${team}:`, err instanceof Error ? err.message : err);
    }
    return [];
  }
}
