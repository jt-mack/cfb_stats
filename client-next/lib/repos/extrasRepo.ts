import { get } from "../apiClient";

export type GameEnrichment = {
  gameId: number;
  odds: { homeWinProbability?: number; spread?: number } | null;
  media: { outlet: string; mediaType: string }[];
  weather: {
    gameIndoors: boolean;
    temperature: number | null;
    windSpeed: number | null;
    precipitation: number | null;
    condition?: { description?: string };
  } | null;
  lines: { lines: { spread: number; overUnder: number; provider: string }[] } | null;
};

export async function getScheduleEnrichment(teamName: string, season?: number) {
  return get<GameEnrichment[]>(
    `/schedule/${encodeURIComponent(teamName)}/enrichment`,
    season !== undefined ? { season } : undefined
  );
}

export async function getLiveScoreboard() {
  return get<ScoreboardGame[]>("/scoreboard");
}

export type ScoreboardGame = {
  id: number;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  status: string;
};

export async function getCalendar(year: number) {
  return get<{ week: number; seasonType: string; startDate: string; endDate: string }[]>(
    `/calendar/${year}`
  );
}

export async function getWeekGames(year: number, week: number) {
  return get<
    {
      id: number;
      week: number;
      homeTeam: string;
      awayTeam: string;
      homePoints: number | null;
      awayPoints: number | null;
      completed: boolean;
      startDate: string;
    }[]
  >(`/week/${year}/${week}`);
}

export type TeamRatings = {
  fpi: { ranking: number | null; rating: number; team: string; label?: string; source?: string } | null;
  efficiency: { ranking: number | null; rating: number; team: string; label?: string; source?: string } | null;
  sp: { ranking: number | null; rating: number; team: string; label?: string } | null;
  srs: { ranking: number | null; rating: number; team: string; label?: string } | null;
  ats: {
    team: string;
    year: number;
    games: number;
    covers: number;
    coverPct: number;
  } | null;
};

export async function getTeamRatings(year: number, teamName: string) {
  return get<TeamRatings>(`/ratings/${year}/team/${encodeURIComponent(teamName)}`);
}

export type EspnDrive = Record<string, unknown>;
export type EspnPlay = Record<string, unknown>;

export async function getGameDrives(gameId: number, season: number, week: number) {
  return get<EspnDrive[]>(`/games/${gameId}/drives`, { season, week });
}

export async function getGamePlays(gameId: number, season: number, week: number) {
  return get<EspnPlay[]>(`/games/${gameId}/plays`, { season, week });
}

export async function getTeamRecruiting(teamName: string, season?: number) {
  return get<{
    recruiting: { rank: number; points: number; team: string; source?: string }[];
    returning: {
      totalPPA: number | null;
      percentPPA: number | null;
      usage: number | null;
      team: string;
      label?: string;
      isEstimate?: boolean;
    }[];
    talent: { year: number; talent: number; team: string; source?: string } | null;
  }>(
    `/team/${encodeURIComponent(teamName)}/recruiting`,
    season !== undefined ? { season } : undefined
  );
}
