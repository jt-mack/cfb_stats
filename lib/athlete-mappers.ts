import type { SdvAthleteCore, SdvAthleteStats, SdvAthleteStatsTeam, SdvEspnLink } from './espn-types';
import type { Athlete, AthleteStatCategory, AthleteStats } from './types';
import { idFromRef, num } from '../utils/parse';

function formatBirthPlace(place: SdvAthleteCore['birthPlace']): string | null {
  if (!place) return null;
  const parts = [place.city, place.state].filter(Boolean);
  if (place.country && place.country !== 'USA' && place.country !== 'US') {
    parts.push(place.country);
  }
  return parts.length ? parts.join(', ') : null;
}

function mapDesktopLinks(links: SdvEspnLink[] | undefined): { href: string; text: string }[] | null {
  const mapped = (links ?? [])
    .filter((l) => l.href && !/^sportscenter:|^watchespn:/i.test(l.href))
    .map((l) => ({ href: l.href!, text: l.text ?? l.rel?.[0] ?? 'Link' }))
    .filter((obj, index, self) => index === self.findIndex((t) => t.text === obj.text));
  return mapped.length ? mapped : null;
}

function jerseyValue(raw: string | number | undefined): string | null {
  if (raw == null || raw === '') return null;
  return String(raw);
}

export function mapAthleteCore(core: SdvAthleteCore): Athlete {
  const id = String(core.id ?? '');
  const displayName = core.displayName ?? core.fullName ?? [core.firstName, core.lastName].filter(Boolean).join(' ');
  const headshot =
    core.headshot?.href ??
    (id ? `https://a.espncdn.com/i/headshots/college-football/players/full/${id}.png` : null);

  return {
    id,
    firstName: core.firstName ?? '',
    lastName: core.lastName ?? '',
    fullName: core.fullName ?? displayName,
    displayName,
    shortName: core.shortName ?? displayName,
    slug: core.slug ?? null,
    jersey: jerseyValue(core.jersey),
    height: num(core.height),
    displayHeight: core.displayHeight ?? null,
    weight: num(core.weight),
    displayWeight: core.displayWeight ?? null,
    headshot,
    position: core.position?.abbreviation ?? null,
    positionName: core.position?.displayName ?? core.position?.name ?? null,
    experience: core.experience?.displayValue ?? null,
    experienceYears: core.experience?.years ?? null,
    birthPlace: formatBirthPlace(core.birthPlace),
    birthCountry: core.birthCountry?.abbreviation ?? core.birthPlace?.country ?? null,
    flag: core.flag?.href ?? null,
    active: core.active ?? core.status?.type === 'active',
    status: core.status?.name ?? null,
    teamId: idFromRef(core.team?.['$ref'], 'teams'),
    links: mapDesktopLinks(core.links),
  };
}

function teamLabel(
  teams: Record<string, SdvAthleteStatsTeam> | undefined,
  teamId: string | number | undefined,
  teamSlug: string | undefined
): string | null {
  const fromSlug = teamSlug ? teams?.[teamSlug] : undefined;
  return fromSlug?.abbreviation ?? fromSlug?.shortDisplayName ?? teamSlug ?? (teamId != null ? String(teamId) : null);
}

export function mapAthleteStats(payload: SdvAthleteStats | null | undefined): AthleteStats {
  const teams = payload?.teams;
  const categories: AthleteStatCategory[] = (payload?.categories ?? []).map((cat) => ({
    name: cat.name ?? cat.sortKey ?? '',
    displayName: cat.displayName ?? cat.name ?? '',
    labels: cat.labels ?? [],
    seasons: (cat.statistics ?? []).map((row) => {
      const year = Number(row.season?.year);
      return {
        season: Number.isFinite(year) ? year : 0,
        seasonLabel: row.season?.displayName ?? (Number.isFinite(year) ? String(year) : ''),
        teamId: row.teamId != null ? String(row.teamId) : null,
        team: teamLabel(teams, row.teamId, row.teamSlug),
        position: row.position ?? null,
        values: row.stats ?? [],
      };
    }),
    totals: cat.totals ?? [],
  }));
  return { categories };
}
