/**
 * CFBD-compatible API types for the frontend.
 *
 * These are domain shapes produced by repos (ESPN → domain maps), not raw
 * sportsdataverse / ESPN types — see `lib/espn-types.ts` for wire response types.
 */

export interface TeamNextEvent {
  id: number;
  name: string;
  date: string;
}

export interface TeamRecordStats {
  wins: number;
  losses: number;
  ties: number;
  gamesPlayed: number;
  pointsFor: number | null;
  pointsAgainst: number | null;
  avgPointsFor: number | null;
  avgPointsAgainst: number | null;
  streak: number | null;
  winPercent: number | null;
  conferenceSummary?: string | null;
}

export interface TeamCoachName {
  firstName: string;
  lastName: string;
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
  location?: Venue | null;
  links?: { href: string; text: string }[] | null;
  /** Overall W-L summary for the requested season. */
  recordSummary?: string | null;
  recordStats?: TeamRecordStats | null;
  rank?: number | null;
  standingSummary?: string | null;
  /** ESPN conference group id for standings drill-down. */
  conferenceGroupId?: string | null;
  nextEvent?: TeamNextEvent | null;
  coach?: TeamCoachName | null;
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
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeRank?: number | null;
  awayRank?: number | null;
  broadcast?: string | null;
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
      athletes: { id: string; name: string; stat: string }[];
    }[];
  }[];
}

export interface Venue {
  id: number | null;
  name?: string;
  address: { city?: string; state?: string } | null;
  grass?: boolean;
  indoor?: boolean;
  image?: string | undefined;
  images: string[] | { href: string, alt?: string }[] | undefined;
}

export interface AdvancedBoxScoreData {
  gameInfo?: {
    homeTeam?: string;
    awayTeam?: string;
    homeWinProb?: number;
    venue?: Venue;
  };
  teams?: Record<string, unknown>;
}

export interface GameDetail {
  game: Game | null;
  teamStats: GameTeamStatEntry[] | null;
  playerStats: GamePlayerStatEntry[] | null;
  venue?: Venue;
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
  jersey?: number | null;
  category: string;
  categoryDisplay: string;
  value: number;
  displayValue: string;
  season: number;
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  shortName: string;
  slug: string | null;
  jersey: string | null;
  height: number | null;
  displayHeight: string | null;
  weight: number | null;
  displayWeight: string | null;
  headshot: string | null;
  position: string | null;
  positionName: string | null;
  experience: string | null;
  experienceYears: number | null;
  birthPlace: string | null;
  birthCountry: string | null;
  flag: string | null;
  active: boolean;
  status: string | null;
  teamId: number | null;
  links: { href: string; text: string }[] | null;
}

export interface AthleteStatSeason {
  season: number;
  seasonLabel: string;
  teamId: string | null;
  team: string | null;
  position: string | null;
  values: string[];
}

export interface AthleteStatCategory {
  name: string;
  displayName: string;
  labels: string[];
  seasons: AthleteStatSeason[];
  totals: string[];
}

export interface AthleteStats {
  categories: AthleteStatCategory[];
}
