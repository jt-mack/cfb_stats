/**
 * Static inventory of domain fields major client-next surfaces read.
 * Verified against repo/domain objects — not a browser test.
 */

export const UI_FIELD_INVENTORY = {
  team: [
    'id',
    'school',
    'abbreviation',
    'conference',
    'color',
    'logos',
    'recordSummary',
    'rank',
    'nextEvent',
    'conferenceGroupId',
  ] as const,
  game: ['id', 'season', 'week', 'startDate', 'completed', 'homeTeam', 'awayTeam', 'homePoints', 'awayPoints'] as const,
  gameDetail: ['game', 'teamStats', 'playerStats', 'advancedBoxScore'] as const,
  teamRecords: ['year', 'teamId', 'team', 'conference', 'total', 'conferenceGames'] as const,
  teamRecord: ['games', 'wins', 'losses', 'ties'] as const,
  rosterPlayer: ['id', 'firstName', 'lastName', 'team', 'position', 'jersey', 'year'] as const,
  coach: ['firstName', 'lastName', 'seasons'] as const,
  pollWeek: ['season', 'seasonType', 'week', 'polls'] as const,
  poll: ['poll', 'ranks'] as const,
  pollRank: ['rank', 'teamId'] as const,
  newsArticle: ['id', 'headline', 'description', 'published', 'link'] as const,
  leaderEntry: [
    'rank',
    'playerId',
    'player',
    'teamId',
    'team',
    'category',
    'categoryDisplay',
    'value',
    'displayValue',
    'season',
  ] as const,
  calendarWeek: ['season', 'week', 'seasonType', 'startDate', 'endDate'] as const,
} as const;

export type UiInventoryKey = keyof typeof UI_FIELD_INVENTORY;
