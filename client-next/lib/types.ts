/**
 * Frontend types for CFB API responses (aligned with backend/ESPN-mapped shapes).
 */

export interface Venue {
  id?: number | null;
  name: string;
  grass: boolean;
  indoor: boolean;
  address: { city?: string; state?: string };
  image: string | undefined;
  images: string[] | { href: string, alt?: string, rel?: string[], width?: number, height?: number }[] | undefined;
}
export interface TeamLocation {
  id?: number;
  name?: string;
  city?: string;
  state?: string;
  zip?: string;
  countryCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  elevation?: string;
  capacity?: number;
  constructionYear?: number;
  grass?: boolean;
  dome?: boolean;
}

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
  location?: TeamLocation | null;
  links?: { href: string; text: string }[] | null;
  recordSummary?: string | null;
  rank?: number | null;
  standingSummary?: string | null;
  conferenceGroupId?: string | null;
  nextEvent?: TeamNextEvent | null;
}

export interface FbsTeamWithRank extends Team {
  rank?: number | null;
  rankLabel?: string;
  rankSource?: "ap" | "coaches" | "cfp" | "fpi" | "prior_ap" | "none";
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
  logo?: string | null;
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
  headshot?: string | null;
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
  venue?: Venue | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homePoints: number | null;
  awayPoints: number | null;
  homeLineScores: number[] | null;
  awayLineScores: number[] | null;
  homePostgameWinProbability?: number | null;
  status?: string | null;
}

export interface GameWithOdds extends Game {
  odds?: PregameWinProbability;
}

export interface GameDetail {
  game: Game | null;
  teamStats: GameTeamStatEntry[] | null;
  playerStats: GamePlayerStatEntry[] | null;
  advancedBoxScore: AdvancedBoxScoreData | null;
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
      athletes: { id: string; name: string; stat: string }[];
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

export type PreviewPlayerStat = {
  playerId: string;
  player: RosterPlayer;
  team: string;
  position: string;
  category: string;
  statType: string;
  stat: string | number;
  season: number;
  jersey: number | null;
  teamLogo: string | null;
};

export interface GamePreview {
  game: Game | null;
  completed: boolean;
  detail: GameDetail | null;
  matchup: {
    team1: string;
    team2: string;
    team1Wins: number;
    team2Wins: number;
    ties: number;
    sinceSeason?: number;
    games: {
      season: number;
      date: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number | null;
      awayScore: number | null;
    }[];
  } | null;
  advancedSeasonStats: {
    team: string;
    season: number;
    offenseEfficiency: number;
    defenseEfficiency: number;
    color?: string | null;
    alternateColor?: string | null;
  }[];
  playerSeasonStats: PreviewPlayerStat[];
  gameLeaders?: {
    team: string;
    category: string;
    player: string;
    displayValue: string;
  }[];
  scoringPlays?: {
    id: string;
    text: string;
    team: string;
    period: number;
    clock: string;
    homeScore: number | null;
    awayScore: number | null;
    scoringType: string;
  }[];
  odds: PregameWinProbability | null;
  lines: {
    lines: { spread: number; overUnder: number; provider: string }[];
  } | null;
  media: { outlet: string; mediaType: string }[];
  weather: {
    gameIndoors: boolean;
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    precipitation: number | null;
    snowfall: number | null;
    condition?: { description?: string };
  } | null;
  statsYear: number;
  statsLabel?: string;
}

/** Single season of a coach at a school (from coaches endpoint). */
export interface CoachSeason {
  school: string;
  year: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  preseasonRank?: number;
  postseasonRank?: number;
  srs?: number;
  spOverall?: number;
  spOffense?: number;
  spDefense?: number;
}

/** Coach record from coaches endpoint. */
export interface Coach {
  firstName: string;
  lastName: string;
  hireDate: string;
  seasons: CoachSeason[];
  partialTenure?: boolean;
  seasonsAtSchool?: number;
  schoolRecordSummary?: string;
  careerRecordSummary?: string;
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
