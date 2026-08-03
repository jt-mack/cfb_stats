/**
 * Normalize ESPN rankings payloads from site.api or CDN core endpoints
 * into a consistent `{ rankings: [...] }` shape.
 */
export function normalizeRankingsPayload(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return { rankings: [] };

  if (Array.isArray(raw.rankings)) return raw;

  const content = raw.content;
  if (content && typeof content === "object") {
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
    (r) => r.type === "ap" || String(r.name ?? "").includes("AP")
  );
  const poll = apPoll ?? rankings[0];
  const ranks = (poll?.ranks as Record<string, unknown>[] | undefined) ?? [];

  const rankMap = new Map<number, number>();
  for (const entry of ranks) {
    const team = entry.team as { id?: string | number } | undefined;
    const id = Number(team?.id);
    const rank = Number(entry.current ?? entry.rank);
    if (id && rank > 0 && rank <= 99) rankMap.set(id, rank);
  }
  return rankMap;
}
