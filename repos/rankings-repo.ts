import { getCfb, getDefaultSeason, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import { POSTSEASON_SEASON_TYPE, REGULAR_SEASON_TYPE } from '../lib/espn-constants';
import type { Poll, PollRank, PollWeek } from '../lib/types';

export function normalizeRankingsPayload(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { rankings: [] };

  if (Array.isArray(raw.rankings)) return raw;

  const content = raw.content;
  if (content && typeof content === 'object') {
    const contentRankings = (content as Record<string, unknown>).rankings;
    if (Array.isArray(contentRankings)) {
      return { ...raw, rankings: contentRankings };
    }
  }

  return { ...raw, rankings: [] };
}

export function parsePollRankMap(raw: Record<string, unknown>): Map<number, number> {
  const normalized = normalizeRankingsPayload(raw);
  const rankings = (normalized.rankings as Record<string, unknown>[] | undefined) ?? [];
  const apPoll = rankings.find(
    (r) => r.type === 'ap' || String(r.name ?? '').includes('AP')
  );
  const poll = apPoll ?? rankings[0];
  const ranks = (poll?.ranks as Record<string, unknown>[] | undefined) ?? [];

  const rankMap = new Map<number, number>();
  for (const entry of ranks) {
    const team = entry.team as { id?: string | number; '$ref'?: string } | undefined;
    let id = Number(team?.id);
    if (!id && team?.['$ref']) {
      const m = String(team['$ref']).match(/teams\/(\d+)/);
      id = m ? Number(m[1]) : 0;
    }
    const rank = Number(entry.current ?? entry.rank);
    if (id && rank > 0 && rank <= 99) rankMap.set(id, rank);
  }
  return rankMap;
}

function mapRankEntry(entry: Record<string, unknown>): PollRank | null {
  const team = entry.team as { id?: string | number; location?: string; displayName?: string; '$ref'?: string } | undefined;
  let id = Number(team?.id);
  if (!id && team?.['$ref']) {
    const m = String(team['$ref']).match(/teams\/(\d+)/);
    id = m ? Number(m[1]) : 0;
  }
  const rank = Number(entry.current ?? entry.rank);
  if (!id || !rank) return null;
  const record = (entry.recordSummary ?? (entry.record as { summary?: string } | undefined)?.summary ?? entry.record) as
    | string
    | undefined;
  const points = entry.points != null ? Number(entry.points) : null;
  const firstPlaceVotes = entry.firstPlaceVotes != null ? Number(entry.firstPlaceVotes) : null;
  const previous = entry.previous != null ? Number(entry.previous) : null;
  return {
    rank,
    previous: Number.isFinite(previous as number) ? previous : null,
    teamId: id,
    school: team?.location ?? team?.displayName,
    record: typeof record === 'string' ? record : undefined,
    points: Number.isFinite(points as number) ? points : null,
    firstPlaceVotes: Number.isFinite(firstPlaceVotes as number) ? firstPlaceVotes : null,
    trend: entry.trend != null ? String(entry.trend) : null,
  };
}

export function parsePollWeek(raw: Record<string, unknown>): PollWeek {
  const normalized = normalizeRankingsPayload(raw);
  const rankings = (normalized.rankings as Record<string, unknown>[] | undefined) ?? [];
  const latestSeason = normalized.latestSeason as
    | { year?: number; type?: { type?: number; name?: string } }
    | undefined;
  const latestWeek = normalized.latestWeek as { number?: number; displayValue?: string } | undefined;

  const polls: Poll[] = [];
  for (const r of rankings) {
    const type = String(r.type ?? '');
    const name = String(r.name ?? '');
    if (type === 'fcs' || name.includes('Division II') || name.includes('Division III') || name.includes('FCS')) {
      continue;
    }
    const ranks = ((r.ranks as Record<string, unknown>[]) ?? [])
      .map(mapRankEntry)
      .filter(Boolean) as PollRank[];
    if (!ranks.length) continue;
    polls.push({
      poll: String(r.name ?? r.shortName ?? 'Poll'),
      pollType: type || undefined,
      ranks,
    });
  }

  const season = Number(latestSeason?.year ?? new Date().getFullYear());
  const seasonTypeNum = Number(latestSeason?.type?.type ?? 2);
  const seasonType =
    seasonTypeNum === 3 ? 'postseason' : seasonTypeNum === 1 ? 'preseason' : 'regular';

  return {
    season,
    seasonType,
    week: Number(latestWeek?.number ?? 0),
    polls,
    headline: latestWeek?.displayValue,
  };
}

function idFromRef(ref: string | undefined | null, kind: 'athletes' | 'teams' | 'coaches'): number | null {
  if (!ref) return null;
  const re = new RegExp(`${kind}/(\\d+)`);
  const m = ref.match(re);
  return m ? Number(m[1]) : null;
}

async function fetchHistoricalRankingsFromCore(season: number): Promise<Record<string, unknown>> {
  const cfb = await getCfb();
  const candidates: Array<{ seasonType: number; week: number }> = [];
  for (let week = 5; week >= 1; week -= 1) candidates.push({ seasonType: POSTSEASON_SEASON_TYPE, week });
  for (let week = 16; week >= 1; week -= 1) candidates.push({ seasonType: REGULAR_SEASON_TYPE, week });

  let items: Array<{ '$ref'?: string }> = [];
  let used = { seasonType: REGULAR_SEASON_TYPE, week: 1 };

  for (const candidate of candidates) {
    try {
      const list = (await cfb.espnCfbSeasonWeekRankings({
        season,
        season_type: candidate.seasonType,
        week: candidate.week,
      })) as { items?: Array<{ '$ref'?: string }>; count?: number };
      if (list?.items?.length) {
        items = list.items;
        used = candidate;
        break;
      }
    } catch {
      // try earlier week / other season type
    }
  }

  if (!items.length) return { rankings: [] };

  const axios = (await import('axios')).default;
  const rankings: Record<string, unknown>[] = [];

  for (const item of items) {
    const ref = item['$ref']?.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');
    if (!ref) continue;
    try {
      const res = await axios.get(ref, { timeout: 8_000 });
      const detail = res.data as {
        name?: string;
        shortName?: string;
        type?: string | number;
        ranks?: Array<Record<string, unknown>>;
      };

      const typeRaw = detail.type;
      const name = String(detail.name ?? '');
      let type = typeRaw != null ? String(typeRaw) : '';
      if (!type || /^\d+$/.test(type)) {
        if (name.includes('AP')) type = 'ap';
        else if (/coach/i.test(name)) type = 'coaches';
        else if (/playoff|cfp|committee/i.test(name)) type = 'cfp';
      }

      rankings.push({
        name: detail.name,
        shortName: detail.shortName,
        type,
        ranks: (detail.ranks ?? []).map((rank) => {
          const team = rank.team as { id?: string | number; '$ref'?: string } | undefined;
          const teamId = team?.id ?? idFromRef(team?.['$ref'], 'teams');
          const record = rank.record as { summary?: string } | undefined;
          return {
            ...rank,
            team: { ...team, id: teamId ?? undefined },
            recordSummary: record?.summary ?? rank.recordSummary,
          };
        }),
      });
    } catch (err) {
      console.warn(
        `Historical ranking ref failed (${ref}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    rankings,
    latestSeason: { year: season, type: { type: used.seasonType } },
    latestWeek: { number: used.week, displayValue: `Week ${used.week}` },
  };
}

export function fetchParsedRankings(
  year?: number,
  options?: SdvRequestOptions
): Promise<Record<string, unknown>> {
  const defaultSeason = getDefaultSeason();
  const season = year ?? defaultSeason;
  const useLivePolls = season >= defaultSeason;

  return sdvRequest(async () => {
    const cfb = await getCfb();
    if (useLivePolls) {
      return (await cfb.espnCfbRankings({})) as Record<string, unknown>;
    }

    return fetchHistoricalRankingsFromCore(season);
  }, {
    cacheKey: options?.cacheKey ?? `espnRankings:${season}`,
    cacheTtlMs: options?.cacheTtlMs ?? 15 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

export class RankingsRepo {
  async getRankings(season?: number): Promise<PollWeek> {
    const raw = await fetchParsedRankings(season, {
      cacheKey: season != null ? `espnRankingsPollWeek:${season}` : 'espnRankingsPollWeek:live',
      cacheTtlMs: 15 * 60 * 1000,
    });
    return parsePollWeek(raw);
  }
}
