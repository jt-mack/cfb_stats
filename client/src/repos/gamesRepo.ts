import { get } from './apiClient';
import type { GameWithOdds, GameDetail } from './types';

/**
 * Team schedule with optional odds (backend: GET /schedule/:team_name).
 */
export async function getSchedule(teamName: string, season?: number): Promise<GameWithOdds[]> {
  const data = await get<GameWithOdds[]>(`/schedule/${encodeURIComponent(teamName)}`, season !== undefined ? { season } : undefined);
  return Array.isArray(data) ? data : [];
}

/**
 * Game detail: game, team stats, player stats, advanced box score (backend: GET /games/:id).
 */
export async function getGameDetail(gameId: number): Promise<GameDetail> {
  return get<GameDetail>(`/games/${gameId}`);
}
