"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useCoaches, useTeamLeaders, useTeamNews } from "@/lib/hooks/queries";
import { PageSpinner } from "@/components/PageSpinner";
import { withAlpha } from "@/lib/teamColors";

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

export default function TeamOverviewTab() {
  const { year, team, schedule, nextGame, style } = useTeamPage();
  const seasonNum = Number(year);
  const teamId = String(team.id);
  const accent = style.color;
  const { data: coaches = [], isLoading: coachesLoading } = useCoaches(teamId, seasonNum);
  const { data: leaders = [] } = useTeamLeaders(teamId, seasonNum);
  const { data: news = [] } = useTeamNews(teamId, seasonNum, 5);

  if (coachesLoading && schedule.length === 0) {
    return <PageSpinner heightClass="h-[30vh]" color={accent} />;
  }

  const completed = schedule.filter((g) => g.completed);
  const last = completed[completed.length - 1];
  const next = nextGame;
  const coach = coaches[0];

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

      <OverviewPanel title="Coach" accent={accent}>
        {coach ? (
          <div className="text-sm text-foreground">
            {[coach.firstName, coach.lastName].filter(Boolean).join(" ")}
            {coach.schoolRecordSummary ? (
              <span className="text-muted-foreground"> · School record {coach.schoolRecordSummary}</span>
            ) : null}
            <Link
              href={`/season/${year}/team/${teamId}/coach`}
              className="block text-xs mt-1 hover:underline"
              style={{ color: accent }}
            >
              Coach details →
            </Link>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Coach unavailable.</p>
        )}
      </OverviewPanel>

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
