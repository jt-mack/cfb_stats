"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useCoaches, useSchedule, useTeamLeaders, useTeamNews } from "@/lib/hooks/queries";
import { PageSpinner } from "@/components/ui/PageSpinner";

export default function TeamOverviewTab() {
  const { year, team } = useTeamPage();
  const seasonNum = Number(year);
  const teamId = String(team.id);
  const { data: schedule = [], isLoading: schedLoading } = useSchedule(team.school, seasonNum);
  const { data: coaches = [] } = useCoaches(teamId, seasonNum);
  const { data: leaders = [] } = useTeamLeaders(teamId, seasonNum);
  const { data: news = [] } = useTeamNews(teamId, seasonNum, 5);

  if (schedLoading) return <PageSpinner heightClass="h-[30vh]" />;

  const completed = schedule.filter((g) => g.completed);
  const upcoming = schedule.filter((g) => !g.completed);
  const last = completed[completed.length - 1];
  const next = upcoming[0];
  const coach = coaches[0];

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Next game</h3>
          {next ? (
            <Link href={`/season/${year}/game/${next.id}`} className="text-zinc-100 hover:underline">
              {next.awayTeam} @ {next.homeTeam}
              <span className="block text-xs text-zinc-400 mt-1">
                {next.startDate ? new Date(next.startDate).toLocaleString("en-US") : "TBD"}
              </span>
            </Link>
          ) : (
            <p className="text-zinc-400 text-sm">No upcoming game scheduled.</p>
          )}
        </div>
        <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Last result</h3>
          {last ? (
            <Link href={`/season/${year}/game/${last.id}`} className="text-zinc-100 hover:underline">
              {last.awayTeam} {last.awayPoints} – {last.homePoints} {last.homeTeam}
            </Link>
          ) : (
            <p className="text-zinc-400 text-sm">No completed games yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Coach</h3>
        {coach ? (
          <div className="text-sm text-zinc-100">
            {[coach.firstName, coach.lastName].filter(Boolean).join(" ")}
            {coach.schoolRecordSummary ? (
              <span className="text-zinc-400"> · School record {coach.schoolRecordSummary}</span>
            ) : null}
            <Link href={`/season/${year}/team/${teamId}/coach`} className="block text-xs text-zinc-500 mt-1 hover:text-zinc-300">
              Coach details →
            </Link>
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">Coach unavailable.</p>
        )}
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-300">Key leaders</h3>
          <Link href={`/season/${year}/team/${teamId}/leaders`} className="text-xs text-zinc-500 hover:text-zinc-300">
            All leaders →
          </Link>
        </div>
        {leaders.length ? (
          <ul className="space-y-1 text-sm">
            {leaders.slice(0, 6).map((l) => (
              <li key={l.category} className="text-zinc-200">
                <span className="text-zinc-400">{l.categoryDisplay}:</span> {l.player} ({l.displayValue})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-400 text-sm">Season leaders not available yet.</p>
        )}
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-300">Team news</h3>
          <Link href={`/season/${year}/team/${teamId}/news`} className="text-xs text-zinc-500 hover:text-zinc-300">
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
                  className="text-sm text-zinc-100 hover:underline"
                >
                  {a.headline}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-400 text-sm">No team news right now.</p>
        )}
      </div>
    </div>
  );
}
