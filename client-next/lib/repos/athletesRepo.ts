import { get } from "../apiClient";
import type { Athlete, AthleteStats } from "../types";

export async function getAthlete(athleteId: string): Promise<Athlete> {
  return get<Athlete>(`/athlete/${encodeURIComponent(athleteId)}`);
}

export async function getAthleteStats(athleteId: string): Promise<AthleteStats> {
  return get<AthleteStats>(`/athlete/${encodeURIComponent(athleteId)}/stats`);
}
