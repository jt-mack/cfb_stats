import { FbsRepo } from '../repos/fbs-repo';
import { seasonInfo as fetchSeasonInfo } from './espn';
import { getDefaultSeason } from './espn-client';
import type { SdvSeasonInfo, SdvSeasonTypeInfo } from './espn-types';

export type SeasonPhase = 'offseason' | 'preseason' | 'regular' | 'postseason';

export type SeasonContext = {
  year: number;
  defaultSeason: number;
  phase: SeasonPhase;
  currentWeek: number | null;
  seasonStarted: boolean;
  firstGameDate: string | null;
  hasPublishedRankings: boolean;
  rankingsWeek: number | null;
  /** Season window from Core `espnCfbSeasonInfo`. */
  startDate: string | null;
  endDate: string | null;
  /** True when `now` falls within the season start/end dates. */
  isActive: boolean;
  /** ESPN current type name when active (e.g. Preseason / Regular Season). */
  activeTypeName: string | null;
  activeTypeId: number | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function phaseFromTypeId(typeId: number | null | undefined): SeasonPhase | null {
  switch (typeId) {
    case 1:
      return 'preseason';
    case 2:
      return 'regular';
    case 3:
      return 'postseason';
    case 4:
      return 'offseason';
    default:
      return null;
  }
}

function findTypeByAbbr(items: SdvSeasonTypeInfo[], abbr: string): SdvSeasonTypeInfo | null {
  return items.find((t) => t.abbreviation === abbr || t.slug?.includes(abbr)) ?? null;
}

function findActiveTypeWindow(items: SdvSeasonTypeInfo[], now: Date): SdvSeasonTypeInfo | null {
  for (const item of items) {
    const start = parseDate(item.startDate);
    const end = parseDate(item.endDate);
    if (start && end && now >= start && now <= end) return item;
  }
  return null;
}

/**
 * Map Core season info into app season context fields (excluding rankings).
 * Prefer date windows on `types.items` over sticky `type` on completed seasons.
 */
export function mapSeasonInfoToContextFields(
  info: SdvSeasonInfo,
  year: number,
  defaultSeason: number,
  now: Date = new Date()
): Omit<SeasonContext, 'hasPublishedRankings' | 'rankingsWeek'> {
  const items = info.types?.items ?? [];
  const startDate = info.startDate ?? null;
  const endDate = info.endDate ?? null;
  const seasonStart = parseDate(startDate);
  const seasonEnd = parseDate(endDate);
  const isActive = !!(seasonStart && seasonEnd && now >= seasonStart && now <= seasonEnd);

  const regular = findTypeByAbbr(items, 'reg') ?? findTypeByAbbr(items, 'regular');
  const firstGameDate = regular?.startDate ?? null;
  const regularStart = parseDate(firstGameDate);

  let phase: SeasonPhase = 'offseason';
  let currentWeek: number | null = null;
  let activeTypeName: string | null = null;
  let activeTypeId: number | null = null;

  if (!isActive) {
    // Completed or not-yet-started relative to season window
    if (seasonStart && now < seasonStart) {
      phase = 'preseason';
      activeTypeName = 'Preseason';
      activeTypeId = 1;
    } else {
      phase = 'offseason';
    }
  } else {
    const window = findActiveTypeWindow(items, now);
    const fromWindow = phaseFromTypeId(window?.type != null ? Number(window.type) : null);
    const fromEspnType = phaseFromTypeId(info.type?.type != null ? Number(info.type.type) : null);
    phase = fromWindow ?? fromEspnType ?? 'preseason';
    activeTypeName = window?.name ?? info.type?.name ?? null;
    activeTypeId = window?.type != null ? Number(window.type) : info.type?.type != null ? Number(info.type.type) : null;

    const weekSource =
      window?.week ??
      (fromWindow && info.type?.type === window?.type ? info.type?.week : info.type?.week);
    if (weekSource?.number != null) currentWeek = Number(weekSource.number);
  }

  // Historical years are never "live" for scoreboard / preseason banners.
  if (year < defaultSeason && (phase === 'regular' || phase === 'postseason')) {
    phase = 'offseason';
    currentWeek = null;
  }

  const seasonStarted = !!(regularStart && now >= regularStart) || (year < defaultSeason && !!regularStart);

  return {
    year,
    defaultSeason,
    phase,
    currentWeek,
    seasonStarted,
    firstGameDate,
    startDate,
    endDate,
    isActive: isActive && year >= defaultSeason,
    activeTypeName,
    activeTypeId,
  };
}

export async function buildSeasonContext(year: number): Promise<SeasonContext> {
  const defaultSeason = getDefaultSeason();
  const fbsRepo = new FbsRepo();

  let base: Omit<SeasonContext, 'hasPublishedRankings' | 'rankingsWeek'>;

  try {
    const info = await fetchSeasonInfo(year, {
      cacheKey: `seasonInfo:${year}`,
      cacheTtlMs: 60 * 60 * 1000,
    });
    base = mapSeasonInfoToContextFields(info, year, defaultSeason);
  } catch (err) {
    console.warn(`buildSeasonContext season info failed for ${year}:`, err instanceof Error ? err.message : err);
    base = {
      year,
      defaultSeason,
      phase: year >= defaultSeason ? 'preseason' : 'offseason',
      currentWeek: null,
      seasonStarted: year < defaultSeason,
      firstGameDate: null,
      startDate: null,
      endDate: null,
      isActive: false,
      activeTypeName: null,
      activeTypeId: null,
    };
  }

  let hasPublishedRankings = false;
  let rankingsWeek: number | null = null;
  try {
    const rankMap = await fbsRepo.getRankingsFromPolls(year);
    if (rankMap.size > 0) {
      hasPublishedRankings = true;
      rankingsWeek = base.currentWeek ?? 1;
    }
  } catch (err) {
    console.warn(`buildSeasonContext rankings failed for ${year}:`, err instanceof Error ? err.message : err);
  }

  return {
    ...base,
    hasPublishedRankings,
    rankingsWeek,
  };
}
