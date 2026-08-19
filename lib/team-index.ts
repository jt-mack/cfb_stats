import { FBS_GROUP, MAIN_CONFERENCE_IDS } from './espn-constants';
import { getCfb, sdvRequest } from './espn-client';
import type { SdvEspnTeam, SdvParsedStandingsRow } from './espn-types';
import type { Team, Venue } from './types';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** ESPN CDN logo URL from team id — used when parsed standings omit team_logo. */
export function espnTeamLogoUrl(teamId: number | string): string {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`;
}

export function resolveTeamLogos(
  teamId: number | string | undefined,
  logos?: { href?: string }[] | null,
  teamLogo?: string | null
): string[] | null {
  const hrefs = logos?.map((l) => l.href).filter(Boolean) as string[] | undefined;
  if (hrefs?.length) return hrefs;
  if (teamLogo) return [teamLogo];
  if (teamId != null && teamId !== '') return [espnTeamLogoUrl(teamId)];
  return null;
}

function resolveEspnGroups(groups: SdvEspnTeam['groups']): {
  id?: string;
  name?: string;
  shortName?: string;
} | undefined {
  if (!groups) return undefined;
  if (Array.isArray(groups)) return groups[0];
  return groups;
}

function mapEspnNextEvent(nextEvent: SdvEspnTeam['nextEvent']): Team['nextEvent'] {
  const first = nextEvent?.[0];
  if (!first) return null;
  const id = num(first.id);
  if (id == null) return null;
  return {
    id,
    name: first.name ?? '',
    date: first.date ?? '',
  };
}

export function mapEspnTeamToTeam(espn: SdvEspnTeam, conference?: string | null): Team {
  const id = num(espn.id) ?? 0;
  const school = espn.location ?? espn.nickname ?? espn.displayName ?? 'Unknown';
  const venue = (espn as { venue?: Record<string, unknown> }).venue;
  const address = venue?.address as { city?: string; state?: string } | undefined;
  const location: Venue | null = venue
    ? {
      id: num(venue.id),
      name: String(venue.fullName ?? venue.displayName ?? ''),
      address: {
        city: String(address?.city ?? (venue as { city?: string }).city ?? ''),
        state: String(address?.state ?? (venue as { state?: string }).state ?? ''),
      },
      grass: Boolean(venue.grass),
      indoor: Boolean(venue.indoor),
      image: Array.isArray(venue.images) ? venue.images.find((image) => image.href)?.href : undefined,
      images: Array.isArray(venue.images) ? venue.images.map((image) => image.href) : undefined,
    }
    : null;

  const links = ((espn.links ?? []) as { href?: string; text?: string; rel?: string[] }[])
    .filter((l) => l.href)
    .map((l) => ({ href: l.href!, text: l.text ?? l.rel?.[0] ?? 'Link' }))
    .filter((obj, index, self) =>
      index === self.findIndex((t) => t.text === obj.text)
    );

  const group = resolveEspnGroups(espn.groups);
  const recordSummary =
    espn.record?.items?.[0]?.summary ?? espn.record?.items?.[0]?.displayValue ?? null;
  const rank = espn.rank != null && espn.rank > 0 ? espn.rank : null;

  return {
    id,
    school,
    mascot: espn.name ?? null,
    abbreviation: espn.abbreviation ?? null,
    conference: conference ?? group?.shortName ?? group?.name ?? null,
    division: null,
    classification: 'fbs',
    color: espn.color ? `#${espn.color.replace('#', '')}` : null,
    alternateColor: espn.alternateColor ? `#${espn.alternateColor.replace('#', '')}` : null,
    logos: resolveTeamLogos(id, espn.logos),
    twitter: (espn as { twitter?: string }).twitter ?? null,
    location,
    links: links.length ? links : null,
    recordSummary,
    rank,
    standingSummary: espn.standingSummary ?? null,
    conferenceGroupId: group?.id != null ? String(group.id) : null,
    nextEvent: mapEspnNextEvent(espn.nextEvent),
  };
}

async function fetchParsedStandings(
  season: number,
  group = FBS_GROUP,
  options?: { cacheKey?: string; cacheTtlMs?: number }
): Promise<SdvParsedStandingsRow[]> {
  const cacheKey = options?.cacheKey ?? `standingsParsed:${season}:${group}`;
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbStandings({ season, group, parsed: true })) as SdvParsedStandingsRow[];
  }, { cacheKey, cacheTtlMs: options?.cacheTtlMs });
}

function teamsFromParsedStandings(rows: SdvParsedStandingsRow[]): Team[] {
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

type YearIndex = {
  byId: Map<number, Team>;
  bySchool: Map<string, Team>;
  byAbbr: Map<string, Team>;
  sortedTeams: Team[];
};

export class TeamIndex {
  /** Immutable per-year snapshots — concurrent requests for different seasons never share mutable state. */
  private indexes = new Map<number, YearIndex>();
  private loadInflight = new Map<number, Promise<YearIndex>>();

  private static indexTeam(index: YearIndex, team: Team): void {
    index.byId.set(team.id, team);
    index.bySchool.set(team.school.toLowerCase(), team);
    if (team.abbreviation) {
      index.byAbbr.set(team.abbreviation.toLowerCase(), team);
    }
  }

  private static async loadYearInto(index: YearIndex, year: number, merge = false): Promise<void> {
    const rows = await fetchParsedStandings(year, undefined, {
      cacheKey: `fbsStandingsParsed:${year}`,
      cacheTtlMs: 24 * 60 * 60 * 1000,
    });

    for (const team of teamsFromParsedStandings(rows)) {
      if (merge && index.byId.has(team.id)) continue;
      TeamIndex.indexTeam(index, team);
    }
  }

  private async buildIndex(year: number): Promise<YearIndex> {
    const index: YearIndex = {
      byId: new Map(),
      bySchool: new Map(),
      byAbbr: new Map(),
      sortedTeams: [],
    };

    await TeamIndex.loadYearInto(index, year);

    // Upcoming-season standings can be sparse; fall back to prior-year membership.
    if (index.byId.size < 100) {
      await TeamIndex.loadYearInto(index, year - 1, true);
    }

    index.sortedTeams = [...index.byId.values()].sort((a, b) => a.school.localeCompare(b.school));
    return index;
  }

  private async load(year: number): Promise<YearIndex> {
    const existing = this.indexes.get(year);
    if (existing) return existing;

    const inflight = this.loadInflight.get(year);
    if (inflight) return inflight;

    const promise = this.buildIndex(year)
      .then((index) => {
        // Don't memoize empty results so transient ESPN failures retry.
        if (index.byId.size > 0) this.indexes.set(year, index);
        return index;
      })
      .finally(() => {
        this.loadInflight.delete(year);
      });

    this.loadInflight.set(year, promise);
    return promise;
  }

  async getAllTeams(year: number): Promise<Team[]> {
    const index = await this.load(year);
    return index.sortedTeams;
  }

  async getFbsTeamIds(year: number): Promise<Set<number>> {
    const index = await this.load(year);
    return new Set(index.byId.keys());
  }

  async resolveTeam(teamIdOrSchool: string, year: number): Promise<Team | null> {
    const index = await this.load(year);
    const idNum = Number(teamIdOrSchool);
    if (!Number.isNaN(idNum)) {
      return index.byId.get(idNum) ?? null;
    }
    const lower = teamIdOrSchool.toLowerCase();
    return (
      index.bySchool.get(lower) ??
      index.byAbbr.get(lower) ??
      [...index.byId.values()].find(
        (t) =>
          t.school.toLowerCase() === lower ||
          t.school.toLowerCase().includes(lower) ||
          lower.includes(t.school.toLowerCase())
      ) ??
      null
    );
  }

  async resolveTeamMeta(
    teamIdOrSchool: string,
    year: number
  ): Promise<{ id: number; school: string } | null> {
    const team = await this.resolveTeam(teamIdOrSchool, year);
    if (!team) return null;
    return { id: team.id, school: team.school };
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

export { MAIN_CONFERENCE_IDS };
