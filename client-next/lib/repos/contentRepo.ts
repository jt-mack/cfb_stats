import { get } from "../apiClient";
import type { DepthChart, LeaderEntry, NewsArticle, PollWeek } from "../types";

export async function getNews(limit = 25): Promise<NewsArticle[]> {
  const data = await get<NewsArticle[]>("/news", { limit });
  return Array.isArray(data) ? data : [];
}

export async function getTeamNews(teamId: string, season?: number, limit = 15): Promise<NewsArticle[]> {
  const data = await get<NewsArticle[]>(
    `/team/${encodeURIComponent(teamId)}/news`,
    {
      limit,
      ...(season !== undefined ? { season } : {}),
    }
  );
  return Array.isArray(data) ? data : [];
}

export async function getLeaders(
  season: number,
  category?: string,
  limit = 25
): Promise<{ season: number; categories: string[]; leaders: LeaderEntry[] }> {
  return get("/leaders", {
    season,
    limit,
    ...(category ? { category } : {}),
  });
}

export async function getTeamLeaders(teamId: string, season: number): Promise<LeaderEntry[]> {
  const data = await get<LeaderEntry[]>(
    `/team/${encodeURIComponent(teamId)}/leaders`,
    { season }
  );
  return Array.isArray(data) ? data : [];
}

export async function getRankings(season?: number): Promise<PollWeek> {
  return get("/rankings", season !== undefined ? { season } : undefined);
}

export async function getDepthChart(teamId: string, season: number): Promise<DepthChart> {
  return get(`/team/${encodeURIComponent(teamId)}/depthchart`, { season });
}
