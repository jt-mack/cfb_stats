import { getCfb, sdvRequest, type SdvRequestOptions } from '../lib/espn-client';
import type { DepthChart, DepthChartPlayer } from '../lib/types';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function fetchTeamDepthcharts(
  teamId: number | string,
  options?: SdvRequestOptions
): Promise<Record<string, unknown>> {
  return sdvRequest(async () => {
    const cfb = await getCfb();
    return (await cfb.espnCfbTeamDepthcharts({ team_id: teamId })) as Record<string, unknown>;
  }, {
    cacheKey: `depthcharts:${teamId}`,
    cacheTtlMs: options?.cacheTtlMs ?? 60 * 60 * 1000,
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Normalize ESPN depth chart payloads. Site responses are often empty in
 * preseason; return available=false rather than treating that as an error.
 */
export function mapDepthChart(
  raw: Record<string, unknown>,
  teamId: number,
  season: number
): DepthChart {
  const players: DepthChartPlayer[] = [];

  const items = asArray<Record<string, unknown>>(raw.items ?? raw.athletes ?? raw.positions);
  for (const item of items) {
    const positions = asArray<Record<string, unknown>>(item.positions ?? item.athletes ?? [item]);
    for (const pos of positions) {
      const athletes = asArray<Record<string, unknown>>(pos.athletes ?? pos.items ?? []);
      const posMeta = pos.position as { displayName?: string } | undefined;
      const positionName = String(posMeta?.displayName ?? pos.displayName ?? pos.name ?? '—');
      const unit = String(item.name ?? item.displayName ?? pos.unit ?? 'Roster');
      athletes.forEach((ath, idx) => {
        const athlete = (ath.athlete as Record<string, unknown>) ?? ath;
        const id = String(athlete.id ?? '');
        if (!id) return;
        players.push({
          athleteId: id,
          name: String(athlete.displayName ?? athlete.fullName ?? 'Unknown'),
          jersey: athlete.jersey != null ? String(athlete.jersey) : null,
          position: positionName,
          rank: Number(ath.rank ?? idx + 1),
          unit,
        });
      });
    }
  }

  // Some payloads nest under team.depthcharts / depthCharts
  const team = raw.team as Record<string, unknown> | undefined;
  if (!players.length && team) {
    const nested = (team.depthcharts ?? team.depthCharts) as Record<string, unknown> | undefined;
    if (nested) return mapDepthChart(nested, teamId, season);
  }

  return {
    teamId,
    season,
    available: players.length > 0,
    players,
  };
}

export class DepthChartRepo {
  async getDepthChart(teamId: number, season: number): Promise<DepthChart> {
    try {
      const raw = await fetchTeamDepthcharts(teamId);
      return mapDepthChart(raw, teamId, season);
    } catch (err) {
      console.warn(`Depth chart unavailable for ${teamId}:`, err instanceof Error ? err.message : err);
      return { teamId, season, available: false, players: [] };
    }
  }
}
