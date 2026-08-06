/**
 * Normalize ESPN rankings payloads from site.api or CDN core endpoints
 * into a consistent `{ rankings: [...] }` shape.
 */
import type { Poll, PollRank, PollWeek } from '../types';

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

/**
 * Extract teamId → rank from a normalized ESPN rankings payload (AP preferred).
 */
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

/** Map site rankings payload into PollWeek (AP / Coaches; skip FCS/D2/D3). */
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
