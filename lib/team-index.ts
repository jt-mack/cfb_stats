import { standings as fetchStandings } from './espn';
import { FBS_CONFERENCES } from './espn-constants';
import type { SdvEspnTeam, SdvRecordItem, SdvRecordStat } from './espn-types';
import { extractStandingsRows } from './standings';
import type { Team, TeamRecordStats, Venue } from './types';
import { idFromRef, num } from '../utils/parse';

/** ESPN CDN logo URL from team id — used when standings omit logos. */
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
  '$ref'?: string;
} | undefined {
  if (!groups) return undefined;
  if (Array.isArray(groups)) return groups[0];
  return groups;
}

export function conferenceGroupIdFromTeam(espn: SdvEspnTeam): string | null {
  const group = resolveEspnGroups(espn.groups);
  if (group?.id != null && group.id !== '') return String(group.id);
  const fromRef = idFromRef(group?.['$ref'], 'groups');
  return fromRef != null ? String(fromRef) : null;
}

export function conferenceNameFromGroupId(groupId: string | null | undefined): string | null {
  if (groupId == null || groupId === '') return null;
  const meta = FBS_CONFERENCES.find((c) => String(c.id) === String(groupId)) as
    | { abbreviation: string; shortName: string }
    | undefined;
  return meta?.abbreviation ?? meta?.shortName ?? null;
}

export function mapEspnNextEvent(nextEvent: SdvEspnTeam['nextEvent']): Team['nextEvent'] {
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

function recordStat(stats: SdvRecordStat[] | undefined, name: string): number | null {
  const row = stats?.find((s) => s.name === name);
  return row?.value != null ? num(row.value) : null;
}

export function mapRecordItems(items: SdvRecordItem[] | undefined | null): {
  recordSummary: string | null;
  recordStats: TeamRecordStats | null;
} {
  if (!items?.length) return { recordSummary: null, recordStats: null };
  const total = items.find((i) => i.type === 'total') ?? items[0];
  const vsconf = items.find((i) => i.type === 'vsconf');
  const stats = total.stats ?? [];
  const wins = recordStat(stats, 'wins') ?? 0;
  const losses = recordStat(stats, 'losses') ?? 0;
  const ties = recordStat(stats, 'ties') ?? 0;
  const gamesPlayed = recordStat(stats, 'gamesPlayed') ?? wins + losses + ties;
  const recordStats: TeamRecordStats = {
    wins,
    losses,
    ties,
    gamesPlayed,
    pointsFor: recordStat(stats, 'pointsFor'),
    pointsAgainst: recordStat(stats, 'pointsAgainst'),
    avgPointsFor: recordStat(stats, 'avgPointsFor'),
    avgPointsAgainst: recordStat(stats, 'avgPointsAgainst'),
    streak: recordStat(stats, 'streak'),
    winPercent: recordStat(stats, 'winPercent'),
    conferenceSummary: vsconf?.summary ?? vsconf?.displayValue ?? null,
  };
  return {
    recordSummary: total.summary ?? total.displayValue ?? null,
    recordStats,
  };
}

/** Core ranks list, a single rank doc, or `$ref`-only items (ignored). */
export function mapRanksToRank(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const direct = num(obj.current ?? obj.rank);
  if (direct != null && direct > 0) return direct;

  const items = obj.items;
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const occurrence = row.occurrence as { number?: unknown } | undefined;
    const value = num(row.current ?? row.rank ?? occurrence?.number);
    if (value != null && value > 0) return value;
  }
  return null;
}

export function synthesizeStandingSummary(
  rank: number | null | undefined,
  conference: string | null | undefined
): string | null {
  if (rank != null && rank > 0 && conference) return `#${rank} · ${conference}`;
  if (conference) return conference;
  return null;
}

export function mapEspnTeamToTeam(espn: SdvEspnTeam, conference?: string | null): Team {
  const id = num(espn.id) ?? 0;
  const school = espn.location ?? espn.nickname ?? espn.displayName ?? 'Unknown';
  const venue = (espn as { venue?: Record<string, unknown> }).venue;
  const address = venue?.address as { city?: string; state?: string } | undefined;
  const city = String(address?.city ?? (venue as { city?: string } | undefined)?.city ?? '');
  const state = String(address?.state ?? (venue as { state?: string } | undefined)?.state ?? '');
  const location: Venue | null = venue
    ? {
      id: num(venue.id),
      name: String(venue.fullName ?? venue.displayName ?? ''),
      address: { city, state },
      grass: Boolean(venue.grass),
      indoor: Boolean(venue.indoor),
      image: Array.isArray(venue.images)
        ? (venue.images as { href?: string }[]).find((image) => image.href)?.href
        : undefined,
      images: Array.isArray(venue.images)
        ? (venue.images as { href?: string }[]).map((image) => image.href).filter(Boolean) as string[]
        : undefined,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    } as Venue
    : null;

  const links = ((espn.links ?? []) as { href?: string; text?: string; rel?: string[] }[])
    .filter((l) => l.href && !/^sportscenter:|^watchespn:/i.test(l.href))
    .map((l) => ({ href: l.href!, text: l.text ?? l.rel?.[0] ?? 'Link' }))
    .filter((obj, index, self) =>
      index === self.findIndex((t) => t.text === obj.text)
    );

  const group = resolveEspnGroups(espn.groups);
  const conferenceGroupId = conferenceGroupIdFromTeam(espn);
  const recordMapped = mapRecordItems(
    espn.record && 'items' in espn.record ? espn.record.items : undefined
  );
  const rank = espn.rank != null && espn.rank > 0 ? espn.rank : null;
  const conferenceName =
    conference ?? group?.shortName ?? group?.name ?? conferenceNameFromGroupId(conferenceGroupId);

  return {
    id,
    school,
    mascot: espn.name ?? null,
    abbreviation: espn.abbreviation ?? null,
    conference: conferenceName,
    division: null,
    classification: 'fbs',
    color: espn.color ? `#${espn.color.replace('#', '')}` : null,
    alternateColor: espn.alternateColor ? `#${espn.alternateColor.replace('#', '')}` : null,
    logos: resolveTeamLogos(id, espn.logos, espn.logo),
    twitter: (espn as { twitter?: string }).twitter ?? null,
    location,
    links: links.length ? links : null,
    recordSummary: recordMapped.recordSummary,
    recordStats: recordMapped.recordStats,
    rank,
    standingSummary: espn.standingSummary ?? null,
    conferenceGroupId,
    nextEvent: mapEspnNextEvent(espn.nextEvent),
    coach: espn.coach?.firstName || espn.coach?.lastName
      ? { firstName: espn.coach.firstName ?? '', lastName: espn.coach.lastName ?? '' }
      : null,
  };
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
    const raw = await fetchStandings(
      { season: year },
      { cacheKey: `fbsStandings:${year}`, cacheTtlMs: 24 * 60 * 60 * 1000 }
    );

    for (const { entry, conference } of extractStandingsRows(raw)) {
      const espn = entry.team;
      if (!espn) continue;
      const team = mapEspnTeamToTeam(espn, conference === 'FBS' ? null : conference);
      if (!team.id) continue;
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
      .then((built) => {
        if (built.byId.size > 0) this.indexes.set(year, built);
        return built;
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

