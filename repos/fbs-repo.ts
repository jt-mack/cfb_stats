import { getFbsTeams, getRankings } from 'cfbd';
import type { Team } from 'cfbd';
import { unwrap } from '../lib/cfbd-client';

/** Team with optional rank from polls (merged type) */
export type FbsTeamWithRank = Team & { rank?: number };

export class FbsRepo {
  /**
   * Get all FBS teams for a year.
   */
  async getFbsTeams(year: number): Promise<Team[]> {
    return unwrap(getFbsTeams({ query: { year } }));
  }

  /**
   * Get rankings for a year (poll weeks). Use latest week for current rank.
   */
  async getRankings(year: number) {
    return unwrap(getRankings({ query: { year } }));
  }

  /**
   * Get FBS teams with rank merged from the most recent rankings week.
   * Returns teams sorted by rank (ranked first), then unranked.
   */
  async getFbsTeamsWithRankings(year: number): Promise<FbsTeamWithRank[]> {
    const [teams, rankings] = await Promise.all([
      this.getFbsTeams(year),
      this.getRankings(year),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, { ...t, rank: 0 as number }]));

    // Use latest week's first poll (e.g. AP) to assign rank
    if (rankings && rankings.length > 0) {
      const latest = rankings.reduce((a, b) => (b.week > a.week ? b : a));
      const poll = latest.polls?.[0];
      if (poll?.ranks) {
        for (const r of poll.ranks) {
          if (r.rank != null && r.teamId != null) {
            const t = teamMap.get(r.teamId);
            if (t) t.rank = r.rank;
          }
        }
      }
    }

    const withRank = Array.from(teamMap.values());
    const ranked = withRank.filter((t) => t.rank > 0).sort((a, b) => a.rank! - b.rank!);
    const unranked = withRank.filter((t) => !t.rank || t.rank === 0);
    return [...ranked, ...unranked];
  }
}
