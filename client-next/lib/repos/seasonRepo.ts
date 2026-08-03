import { get } from "../apiClient";

export type SeasonPhase = "offseason" | "preseason" | "regular" | "postseason";

export type SeasonContext = {
  year: number;
  defaultSeason: number;
  phase: SeasonPhase;
  currentWeek: number | null;
  seasonStarted: boolean;
  firstGameDate: string | null;
  hasPublishedRankings: boolean;
  rankingsWeek: number | null;
};

export async function getDefaultSeasonFromApi(): Promise<number> {
  const data = await get<{ defaultSeason: number }>("/season/default");
  return data.defaultSeason;
}

export async function getSeasonContext(year: number): Promise<SeasonContext> {
  return get<SeasonContext>(`/season/${year}/context`);
}
