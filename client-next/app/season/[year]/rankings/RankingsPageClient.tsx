"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useRankings } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RankingsPageClient() {
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data, isLoading, isError } = useRankings(seasonNum);
  const [pollIndex, setPollIndex] = useState(0);

  const polls = data?.polls ?? [];
  const activePoll = polls[Math.min(pollIndex, Math.max(polls.length - 1, 0))];

  const ranks = useMemo(() => activePoll?.ranks ?? [], [activePoll]);

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;
  if (isLoading) return <PageSpinner heightClass="h-[40vh]" />;
  if (isError) return <PageError message="Failed to load rankings." />;

  if (!polls.length) {
    return (
      <div className="text-center space-y-2 py-12">
        <h1 className="text-xl font-semibold text-zinc-100">{year} Rankings</h1>
        <p className="text-zinc-400">Rankings are not available yet for this season.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-zinc-100">National Rankings</h1>
        <p className="text-sm text-zinc-400">
          {data?.season ?? year}
          {data?.headline ? ` · ${data.headline}` : data?.week ? ` · Week ${data.week}` : ""}
          {data?.season && data.season !== seasonNum
            ? " (latest published poll; selected season may still be preseason)"
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {polls.map((p, i) => (
          <button
            key={p.poll}
            type="button"
            onClick={() => setPollIndex(i)}
            className={`text-xs px-2 py-1 rounded border ${
              i === pollIndex
                ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {p.poll}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-700">
              <TableHead className="text-zinc-400">Rank</TableHead>
              <TableHead className="text-zinc-400">Prev</TableHead>
              <TableHead className="text-zinc-400">Team</TableHead>
              <TableHead className="text-zinc-400">Record</TableHead>
              <TableHead className="text-zinc-400 text-right">Points</TableHead>
              <TableHead className="text-zinc-400 text-right">1st</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranks.map((r) => (
              <TableRow key={r.teamId} className="border-zinc-800">
                <TableCell className="text-zinc-100 font-medium">{r.rank}</TableCell>
                <TableCell className="text-zinc-400">{r.previous ?? "—"}</TableCell>
                <TableCell>
                  <Link
                    href={`/season/${year}/team/${r.teamId}`}
                    className="text-zinc-100 hover:underline"
                  >
                    {r.school ?? `Team ${r.teamId}`}
                  </Link>
                </TableCell>
                <TableCell className="text-zinc-300">{r.record ?? "—"}</TableCell>
                <TableCell className="text-right text-zinc-300">{r.points ?? "—"}</TableCell>
                <TableCell className="text-right text-zinc-400">{r.firstPlaceVotes ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
