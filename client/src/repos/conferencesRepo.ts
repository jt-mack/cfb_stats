import { get } from './apiClient';
import type { Conference, Team, TeamRecords } from './types';

/**
 * All conferences (backend: GET /conferences).
 */
export async function getConferences(): Promise<Conference[]> {
  const data = await get<Conference[]>('/conferences');
  return Array.isArray(data) ? data : [];
}

/**
 * Conference standings/records (backend: GET /conferences/:id/standings).
 */
export async function getStandings(conferenceId: string, season?: number): Promise<TeamRecords[]> {
  const data = await get<TeamRecords[]>(`/conferences/${encodeURIComponent(conferenceId)}/standings`, season !== undefined ? { season } : undefined);
  return Array.isArray(data) ? data : [];
}

/**
 * Teams in a conference (backend: GET /teams/conference/:id).
 */
export async function getTeamsByConference(conferenceId: string, season?: number): Promise<Team[]> {
  const data = await get<Team[]>(`/teams/conference/${encodeURIComponent(conferenceId)}`, season !== undefined ? { season } : undefined);
  return Array.isArray(data) ? data : [];
}
