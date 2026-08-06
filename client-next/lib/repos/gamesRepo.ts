import { get } from "../apiClient";
import type { GameWithOdds, GameDetail, GamePreview } from "../types";

/**
 * Team schedule with optional odds (backend: GET /schedule/:team_name).
 */
export async function getSchedule(
  teamName: string,
  season?: number
): Promise<GameWithOdds[]> {
  const data = await get<GameWithOdds[]>(
    `/schedule/${encodeURIComponent(teamName)}`,
    season !== undefined ? { season } : undefined
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Game detail: game, team stats, player stats, advanced box score (backend: GET /games/:id).
 */
export async function getGameDetail(gameId: number): Promise<GameDetail> {
  return get<GameDetail>(`/games/${gameId}`);
}

/**
 * Game preview for upcoming or completed games (backend: GET /preview/:id).
 */
export async function getGamePreview(
  gameId: number,
  season?: number
): Promise<GamePreview> {
  return get<GamePreview>(`/preview/${gameId}`, season !== undefined ? { season } : undefined);
}
