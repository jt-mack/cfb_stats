import {
  FBS_GROUP,
  fetchCoach,
  fetchCoachRecord,
  fetchParsedStandings,
  fetchTeam,
  fetchTeamCoachEntry,
  fetchParsedTeamRoster,
  idFromRef,
  mapEspnTeamToTeam,
  mapParsedRosterRows,
  mapSeasonCoachEntry,
} from '../lib/sdv';
import { teamIndex } from '../lib/team-index';
import type { Coach, CoachSeason, RosterPlayer, Team } from '../lib/types';

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
