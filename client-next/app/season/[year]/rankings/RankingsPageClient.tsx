"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useRankings } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
        <h1 className="text-xl font-semibold text-foreground">{year} Rankings</h1>
        <p className="text-muted-foreground">Rankings are not available yet for this season.</p>
      </div>
    );
  }

  const pollValue = polls[pollIndex]?.poll ?? polls[0]?.poll;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-foreground">National Rankings</h1>
        <p className="text-sm text-muted-foreground">
          {data?.season ?? year}
          {data?.headline ? ` · ${data.headline}` : data?.week ? ` · Week ${data.week}` : ""}
          {data?.season && data.season !== seasonNum
            ? " (latest published poll; selected season may still be preseason)"
            : ""}
        </p>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={1}
        value={pollValue}
        onValueChange={(v) => {
          const idx = polls.findIndex((p) => p.poll === v);
          if (idx >= 0) setPollIndex(idx);
        }}
        className="flex flex-wrap justify-center w-full max-w-full"
      >
        {polls.map((p) => (
          <ToggleGroupItem key={p.poll} value={p.poll} className="text-xs">
            {p.poll}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Prev</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">1st</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranks.map((r) => (
              <TableRow key={r.teamId}>
                <TableCell className="font-medium">{r.rank}</TableCell>
                <TableCell className="text-muted-foreground">{r.previous ?? "—"}</TableCell>
                <TableCell>
                  <Link
                    href={`/season/${year}/team/${r.teamId}`}
                    className="hover:underline"
                  >
                    {r.school ?? `Team ${r.teamId}`}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground/80">{r.record ?? "—"}</TableCell>
                <TableCell className="text-right text-foreground/80">{r.points ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {r.firstPlaceVotes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
