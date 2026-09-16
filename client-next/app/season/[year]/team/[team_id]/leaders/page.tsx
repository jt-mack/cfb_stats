"use client";

import Link from "next/link";
import { useTeamPage } from "../TeamPageContext";
import { useTeamLeaders } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { athletePath } from "@/lib/athlete";
import type { LeaderEntry, RosterPlayer } from "@/lib/types";

function toRosterPlayer(entry: LeaderEntry): RosterPlayer {
  const [firstName, ...rest] = entry.player.split(" ");
  return {
    id: entry.playerId,
    firstName: firstName ?? entry.player,
    lastName: rest.join(" "),
    team: entry.team,
    height: null,
    weight: null,
    jersey: entry.jersey ?? null,
    year: 0,
    position: entry.position,
  };
}

export default function TeamLeadersPage() {
  const { year, team } = useTeamPage();
  const { data: leaders = [], isLoading, isError } = useTeamLeaders(String(team.id), Number(year));

  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load team leaders." />;
  if (!leaders.length) {
    return <p className="py-8 text-center text-muted-foreground">Team leaders are not available for this season yet.</p>;
  }

  // Group stat lines by player, preserving category order for first appearance
  const byPlayer = new Map<string, LeaderEntry[]>();
  for (const entry of leaders) {
    const existing = byPlayer.get(entry.playerId);
    if (existing) existing.push(entry);
    else byPlayer.set(entry.playerId, [entry]);
  }

  return (
    <div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {[...byPlayer.values()].map((entries) => (
          <PlayerCard
            key={entries[0].playerId}
            player={toRosterPlayer(entries[0])}
            variant="stat-leader"
            imgSize="full"
            team={team}
            href={athletePath(year, entries[0].playerId)}
          >
            <dl className="mt-2 space-y-1">
              {entries.map((e) => (
                <div key={e.category} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="text-muted-foreground">{e.categoryDisplay}</dt>
                  <dd className="font-semibold text-foreground">{e.displayValue}</dd>
                </div>
              ))}
            </dl>
          </PlayerCard>
        ))}
      </div>
      <p className="text-xs text-muted-foreground p-2">
        Team statistical leaders for the{" "}
        <Link href={`/season/${year}/stats`} className="underline hover:text-foreground">
          {leaders[0]?.season ?? year}
        </Link>{" "}
        season.
      </p>
    </div>
  );
}
