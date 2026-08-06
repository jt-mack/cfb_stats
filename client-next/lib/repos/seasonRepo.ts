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
  startDate: string | null;
  endDate: string | null;
  /** True when now is within this season's ESPN start/end and it is the default season. */
  isActive: boolean;
  activeTypeName: string | null;
  activeTypeId: number | null;
};

export async function getDefaultSeasonFromApi(): Promise<number> {
  const data = await get<{ defaultSeason: number }>("/season/default");
  return data.defaultSeason;
}

export async function getSeasonContext(year: number): Promise<SeasonContext> {
  return get<SeasonContext>(`/season/${year}/context`);
}
