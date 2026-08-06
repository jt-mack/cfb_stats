/**
 * CFBD-compatible API types for the frontend.
 *
 * These are domain shapes produced by our mappers (`lib/sdv/mappers.ts`), not raw
 * sportsdataverse / ESPN types — see `lib/sdv/types.ts` for SDV response types.
 */

export interface TeamNextEvent {
  id: number;
  name: string;
  date: string;
}

export interface Team {
  id: number;
  school: string;
  mascot: string | null;
  abbreviation: string | null;
  conference: string | null;
  division: string | null;
  classification?: string | null;
  color: string | null;
  alternateColor: string | null;
  logos: string[] | null;
  twitter?: string | null;
  alternateNames?: string[] | null;
  location?: {
    name?: string;
    city?: string;
    state?: string;
    capacity?: number | null;
    constructionYear?: number | null;
    grass?: boolean;
    dome?: boolean;
  } | null;
  links?: { href: string; text: string }[] | null;
  /** From ESPN team hub — overall W-L summary when present. */
  recordSummary?: string | null;
  rank?: number | null;
  standingSummary?: string | null;
  /** ESPN conference group id for standings drill-down. */
  conferenceGroupId?: string | null;
  nextEvent?: TeamNextEvent | null;
}

export interface Conference {
  id: number;
  name: string;
  shortName: string | null;
  abbreviation: string | null;
  classification?: string | null;
  logo?: string;
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
}

export interface PregameWinProbability {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  spread: number;
  homeWinProbability: number;
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
  status?: string;
}

export interface GameWithOdds extends Game {
  odds?: PregameWinProbability;
}

export interface GameTeamStatEntry {
  id: number;
  teams: {
    teamId: number;
    team: string;
    homeAway: string;
    points: number | null;
    color?: string | null;
    alternateColor?: string | null;
    stats: { category: string; stat: string }[];
  }[];
}

export interface GamePlayerStatEntry {
  id: number;
  teams: {
    team: string;
    categories: {
      name: string;
      types: {
        name: string;
        athletes: { id: string; name: string; stat: string }[];
      }[];
    }[];
  }[];
}

export interface AdvancedBoxScoreData {
  gameInfo?: {
    homeTeam?: string;
    awayTeam?: string;
    homeWinProb?: number;
    venue?: { fullName?: string };
  };
  teams?: Record<string, unknown>;
}

export interface GameDetail {
  game: Game | null;
  teamStats: GameTeamStatEntry[] | null;
  playerStats: GamePlayerStatEntry[] | null;
  advancedBoxScore: AdvancedBoxScoreData | null;
}

export interface Matchup {
  team1: string;
  team2: string;
  team1Wins: number;
  team2Wins: number;
  ties: number;
  /** Earliest season included in the calculated series (disclosed range). */
  sinceSeason?: number;
  games: {
    season: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  }[];
}

/** ESPN power-index efficiencies — not CFBD PPA / success rate. */
export interface AdvancedSeasonStat {
  team: string;
  season: number;
  offenseEfficiency: number;
  defenseEfficiency: number;
  color?: string | null;
  alternateColor?: string | null;
}

export interface PlayerStat {
  playerId: string;
  player: string;
  team: string;
  position: string;
  category: string;
  statType: string;
  stat: string;
  season: number;
}

export interface BettingGame {
  id: number;
  lines: { spread: number; overUnder: number; provider: string }[];
}

export interface GameMedia {
  outlet: string;
  mediaType: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface GameWeather {
  gameIndoors: boolean;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation: number | null;
  snowfall: number | null;
  condition?: { description?: string };
}

export interface CoachSeason {
  school: string;
  year: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface Coach {
  firstName: string;
  lastName: string;
  hireDate: string;
  seasons: CoachSeason[];
  /** True when school tenure could only be partially reconstructed. */
  partialTenure?: boolean;
  seasonsAtSchool?: number;
  schoolRecordSummary?: string;
  careerRecordSummary?: string;
}

export interface SpRating {
  team: string;
  ranking?: number;
  rating?: number;
}

export interface CalendarWeek {
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  endDate: string;
}

export interface PollRank {
  rank: number;
  previous?: number | null;
  teamId: number;
  school?: string;
  record?: string;
  points?: number | null;
  firstPlaceVotes?: number | null;
  trend?: string | null;
}

export interface Poll {
  poll: string;
  pollType?: string;
  ranks: PollRank[];
}

export interface PollWeek {
  season: number;
  seasonType: string;
  week: number;
  polls: Poll[];
  headline?: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  byline: string | null;
  imageUrl: string | null;
  link: string | null;
  premium: boolean;
  categories: string[];
}

export interface LeaderEntry {
  rank: number;
  playerId: string;
  player: string;
  teamId: number;
  team: string;
  position: string | null;
  category: string;
  categoryDisplay: string;
  value: number;
  displayValue: string;
  season: number;
}

export interface DepthChartPlayer {
  athleteId: string;
  name: string;
  jersey: string | null;
  position: string;
  rank: number;
  unit: string;
}

export interface DepthChart {
  teamId: number;
  season: number;
  available: boolean;
  players: DepthChartPlayer[];
}
