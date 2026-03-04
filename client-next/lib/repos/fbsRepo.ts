import { get } from "../apiClient";
import type { FbsTeamWithRank } from "../types";

/**
 * FBS teams and rankings (backend: GET /teams).
 */
export async function getTeams(
  season?: number
): Promise<FbsTeamWithRank[]> {
  const data = await get<FbsTeamWithRank[]>(
    "/teams",
    season !== undefined ? { season } : undefined
  );
  return Array.isArray(data) ? data : [];
}
