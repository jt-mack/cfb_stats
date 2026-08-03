import { fetchParsedStandings, mapEspnTeamToTeam, resolveTeamLogos } from './sdv';
import type { Team } from './types';

function teamsFromParsedStandings(
  rows: Awaited<ReturnType<typeof fetchParsedStandings>>
): Team[] {
  return rows
    .map((row) => {
      const id = Number(row.team_id);
      if (!id) return null;
      return mapEspnTeamToTeam(
        {
          id: row.team_id,
          location: row.team_location,
          name: row.team_name,
          displayName: row.team_display_name,
          abbreviation: row.team_abbreviation,
          logos: resolveTeamLogos(row.team_id, undefined, row.team_logo)?.map((href) => ({ href })),
        },
        row.group_abbreviation ?? null
      );
    })
    .filter(Boolean) as Team[];
}

export class TeamIndex {
  private byId = new Map<number, Team>();
  private bySchool = new Map<string, Team>();
  private byAbbr = new Map<string, Team>();
  private loadedYear: number | null = null;
  private loadInflight = new Map<number, Promise<void>>();

  private indexTeam(team: Team): void {
    this.byId.set(team.id, team);
    this.bySchool.set(team.school.toLowerCase(), team);
    if (team.abbreviation) {
      this.byAbbr.set(team.abbreviation.toLowerCase(), team);
    }
  }

  private async loadYear(year: number, merge = false): Promise<void> {
    const rows = await fetchParsedStandings(year, undefined, {
      cacheKey: `fbsStandingsParsed:${year}`,
      cacheTtlMs: 24 * 60 * 60 * 1000,
    });

    for (const team of teamsFromParsedStandings(rows)) {
      if (merge && this.byId.has(team.id)) continue;
      this.indexTeam(team);
    }
  }

  async load(year: number): Promise<void> {
    if (this.loadedYear === year && this.byId.size > 0) return;

    const inflight = this.loadInflight.get(year);
    if (inflight) return inflight;

    const promise = (async () => {
      this.byId.clear();
      this.bySchool.clear();
      this.byAbbr.clear();

      await this.loadYear(year);

      // Upcoming-season standings can be sparse; fall back to prior-year membership.
      if (this.byId.size < 100) {
        await this.loadYear(year - 1, true);
      }

      this.loadedYear = year;
    })().finally(() => {
      this.loadInflight.delete(year);
    });

    this.loadInflight.set(year, promise);
    return promise;
  }

  async getAllTeams(year: number): Promise<Team[]> {
    await this.load(year);
    return [...this.byId.values()].sort((a, b) => a.school.localeCompare(b.school));
  }

  async getFbsTeamIds(year: number): Promise<Set<number>> {
    await this.load(year);
    return new Set(this.byId.keys());
  }

  async resolveTeam(teamIdOrSchool: string, year: number): Promise<Team | null> {
    await this.load(year);
    const idNum = Number(teamIdOrSchool);
    if (!Number.isNaN(idNum)) {
      return this.byId.get(idNum) ?? null;
    }
    const lower = teamIdOrSchool.toLowerCase();
    return (
      this.bySchool.get(lower) ??
      this.byAbbr.get(lower) ??
      [...this.byId.values()].find(
        (t) =>
          t.school.toLowerCase() === lower ||
          t.school.toLowerCase().includes(lower) ||
          lower.includes(t.school.toLowerCase())
      ) ??
      null
    );
  }

  async resolveTeamId(teamIdOrSchool: string, year: number): Promise<number | null> {
    const team = await this.resolveTeam(teamIdOrSchool, year);
    return team?.id ?? null;
  }

  async resolveSchoolName(teamIdOrSchool: string, year: number): Promise<string | null> {
    const team = await this.resolveTeam(teamIdOrSchool, year);
    return team?.school ?? null;
  }
}

export const teamIndex = new TeamIndex();

export { MAIN_CONFERENCE_IDS } from './sdv';
