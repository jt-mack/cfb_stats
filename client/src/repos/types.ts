/**
 * Frontend types for CFB API responses (aligned with backend/CFBD shapes).
 */

export interface Team {
  id: number;
  school: string;
  mascot: string | null;
  abbreviation: string | null;
  conference: string | null;
  division: string | null;
  color: string | null;
  alternateColor: string | null;
  logos: string[] | null;
  [key: string]: unknown;
}

export interface FbsTeamWithRank extends Team {
  rank?: number;
}

export interface Conference {
  id: number;
  name: string;
  shortName: string | null;
  abbreviation: string | null;
  [key: string]: unknown;
}

export interface TeamRecord {
  games: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface TeamRecords {
  year: number;
  teamId: number;
  team: string;
  conference: string;
  total: TeamRecord;
  conferenceGames: TeamRecord;
  [key: string]: unknown;
}

export interface RosterPlayer {
  id: string;
  firstName: string;
  lastName: string;
  team: string;
  height: number | null;
  weight: number | null;
  jersey: number | null;
  year: number;
  position: string | null;
  [key: string]: unknown;
}

export interface PregameWinProbability {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  spread: number;
  homeWinProbability: number;
  [key: string]: unknown;
}

export interface Game {
  id: number;
  season: number;
  week: number;
  startDate: string;
  completed: boolean;
  neutralSite: boolean;
  conferenceGame: boolean;
  venue: string | null;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  homeLineScores: number[] | null;
  awayLineScores: number[] | null;
  homePostgameWinProbability?: number | null;
  [key: string]: unknown;
}

export interface GameWithOdds extends Game {
  odds?: PregameWinProbability;
}

export interface GameDetail {
  game: Game | null;
  teamStats: unknown[] | null;
  playerStats: unknown[] | null;
  advancedBoxScore: unknown | null;
}
