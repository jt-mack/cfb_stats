"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useTeamLeaders, useTeamNews } from "@/lib/hooks/queries";
import { PageSpinner } from "@/components/PageSpinner";
import { withAlpha } from "@/lib/teamColors";
import { BarChart } from "@/components/charts/BarChart";
import type { GameWithOdds, TeamRecordStats } from "@/lib/types";

function OverviewPanel({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card/80 p-4"
      style={
        accent
          ? { borderLeftWidth: 3, borderLeftColor: accent, boxShadow: `inset 3px 0 0 ${withAlpha(accent, 0.15)}` }
          : undefined
      }
    >
      <h3 className="text-sm font-medium text-foreground/80 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function isHomeTeam(game: GameWithOdds, school: string) {
  return game.homeTeam === school;
}

function teamWon(game: GameWithOdds, school: string): boolean {
  return (
    (game.homeTeam === school && (game.homePoints ?? 0) > (game.awayPoints ?? 0)) ||
    (game.awayTeam === school && (game.awayPoints ?? 0) > (game.homePoints ?? 0))
  );
}

function formatStreak(streak: number | null | undefined): string | null {
  if (streak == null || streak === 0) return null;
  return streak > 0 ? `W${streak}` : `L${Math.abs(streak)}`;
}

function formatAvg(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return value.toFixed(1);
}

function conferenceRecord(
  stats: TeamRecordStats | null | undefined,
  schedule: GameWithOdds[],
  school: string
): string | null {
  if (stats?.conferenceSummary && stats.conferenceSummary !== "0-0") return stats.conferenceSummary;
  const games = schedule.filter((g) => g.completed && g.conferenceGame);
  if (!games.length) return null;
  let wins = 0;
  let losses = 0;
  for (const game of games) {
    if (teamWon(game, school)) wins += 1;
    else losses += 1;
  }
  return `${wins}-${losses}`;
}

export default function TeamOverviewTab() {
  const { year, team, schedule, nextGame, style } = useTeamPage();
  const seasonNum = Number(year);
  const teamId = String(team.id);
  const accent = style.color;
  const { data: leaders = [] } = useTeamLeaders(teamId, seasonNum);
  const { data: news = [] } = useTeamNews(teamId, seasonNum, 5);

  if (!team.school && schedule.length === 0) {
    return <PageSpinner heightClass="h-[30vh]" color={accent} />;
  }

  const completed = schedule.filter((g) => g.completed);
  const last = completed[completed.length - 1];
  const next = nextGame;
  const stats = team.recordStats;
  const streak = formatStreak(stats?.streak);
  const confRecord = conferenceRecord(stats, schedule, team.school);
  const differential =
    stats?.pointsFor != null && stats?.pointsAgainst != null
      ? stats.pointsFor - stats.pointsAgainst
      : null;

  const scoringLabels = completed.map((g) => `Wk ${g.week || "?"}`);
  const pointsFor = completed.map((g) =>
    isHomeTeam(g, team.school) ? (g.homePoints ?? 0) : (g.awayPoints ?? 0)
  );
  const pointsAgainst = completed.map((g) =>
    isHomeTeam(g, team.school) ? (g.awayPoints ?? 0) : (g.homePoints ?? 0)
  );

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewPanel title="Next game" accent={accent}>
          {next ? (
            <Link href={`/season/${year}/game/${next.id}`} className="text-foreground hover:underline">
              {next.awayTeam} @ {next.homeTeam}
              <span className="block text-xs text-muted-foreground mt-1">
                {next.startDate ? new Date(next.startDate).toLocaleString("en-US") : "TBD"}
              </span>
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">No upcoming game scheduled.</p>
          )}
        </OverviewPanel>
        <OverviewPanel title="Last result" accent={accent}>
          {last ? (
            <Link href={`/season/${year}/game/${last.id}`} className="text-foreground hover:underline">
              {last.awayTeam} {last.awayPoints} – {last.homePoints} {last.homeTeam}
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">No completed games yet.</p>
          )}
        </OverviewPanel>
      </div>

      {(stats || confRecord) && (
        <OverviewPanel title="Season snapshot" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {formatAvg(stats?.avgPointsFor) && (
              <div>
                <div className="text-xs text-muted-foreground">PPG</div>
                <div className="font-medium">{formatAvg(stats?.avgPointsFor)}</div>
              </div>
            )}
            {formatAvg(stats?.avgPointsAgainst) && (
              <div>
                <div className="text-xs text-muted-foreground">PAPG</div>
                <div className="font-medium">{formatAvg(stats?.avgPointsAgainst)}</div>
              </div>
            )}
            {differential != null && (
              <div>
                <div className="text-xs text-muted-foreground">Scoring margin</div>
                <div className="font-medium">
                  {differential > 0 ? "+" : ""}
                  {differential}
                </div>
              </div>
            )}
            {streak && (
              <div>
                <div className="text-xs text-muted-foreground">Streak</div>
                <div className="font-medium">{streak}</div>
              </div>
            )}
            {confRecord && (
              <div>
                <div className="text-xs text-muted-foreground">Conference</div>
                <div className="font-medium">{confRecord}</div>
              </div>
            )}
          </div>
        </OverviewPanel>
      )}

      {completed.length > 0 && (
        <OverviewPanel title="Scoring by week" accent={accent}>
          <BarChart
            labels={scoringLabels}
            datasets={[
              {
                label: "Points for",
                data: pointsFor,
                backgroundColor: withAlpha(accent ?? "#2563eb", 0.75),
                borderColor: accent ?? "#2563eb",
              },
              {
                label: "Points against",
                data: pointsAgainst,
                backgroundColor: withAlpha(style.backgroundColor ?? "#71717a", 0.7),
                borderColor: style.backgroundColor ?? "#71717a",
              },
            ]}
          />
        </OverviewPanel>
      )}

      <OverviewPanel title="Key leaders" accent={accent}>
        <div className="flex items-center justify-end mb-2 -mt-1">
          <Link
            href={`/season/${year}/team/${teamId}/leaders`}
            className="text-xs hover:underline"
            style={{ color: accent }}
          >
            All leaders →
          </Link>
        </div>
        {leaders.length ? (
          <ul className="space-y-1 text-sm">
            {leaders.slice(0, 6).map((l) => (
              <li key={l.category} className="text-foreground">
                <span className="text-muted-foreground">{l.categoryDisplay}:</span> {l.player} ({l.displayValue})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Season leaders not available yet.</p>
        )}
      </OverviewPanel>

      <OverviewPanel title="Team news" accent={accent}>
        <div className="flex items-center justify-end mb-2 -mt-1">
          <Link
            href={`/season/${year}/team/${teamId}/news`}
            className="text-xs hover:underline"
            style={{ color: accent }}
          >
            More →
          </Link>
        </div>
        {news.length ? (
          <ul className="space-y-2">
            {news.slice(0, 3).map((a) => (
              <li key={a.id}>
                <a
                  href={a.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground hover:underline"
                >
                  {a.headline}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No team news right now.</p>
        )}
      </OverviewPanel>
    </div>
  );
}
