import { get } from './apiClient';
import type { Team, RosterPlayer } from './types';

/**
 * Single team info by id or school name (backend: GET /team/:id/information).
 */
export async function getTeamInfo(teamId: string, season?: number): Promise<Team> {
  return get<Team>(`/team/${encodeURIComponent(teamId)}/information`, season !== undefined ? { season } : undefined);
}

/**
 * Team roster (backend: GET /team/:id/players).
 */
export async function getRoster(teamId: string, season?: number): Promise<RosterPlayer[]> {
  const data = await get<RosterPlayer[]>(`/team/${encodeURIComponent(teamId)}/players`, season !== undefined ? { season } : undefined);
  return Array.isArray(data) ? data : [];
}
