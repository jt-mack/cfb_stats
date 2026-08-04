"use client";

import { useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useLeaders } from "@/lib/hooks/queries";
import { PageSpinner, PageError } from "@/components/ui/PageSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function StatsPageClient() {
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data, isLoading, isError } = useLeaders(seasonNum, category, 25);

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;

  const categories = data?.categories ?? [];
  const active = category ?? categories[0];
  const leaders = data?.leaders ?? [];
  const dataSeason = data?.season;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-zinc-100">National Leaders</h1>
        <p className="text-sm text-zinc-400">
          {dataSeason && dataSeason !== seasonNum
            ? `Showing ${dataSeason} leaders (current season not yet populated).`
            : `${year} statistical leaders.`}
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-xs px-2 py-1 rounded border ${
                active === c
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <PageSpinner heightClass="h-[40vh]" />
      ) : isError ? (
        <PageError message="Failed to load leaders." />
      ) : !leaders.length ? (
        <p className="text-center text-zinc-400 py-8">
          Leaders are not available for this season yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">#</TableHead>
                <TableHead className="text-zinc-400">Player</TableHead>
                <TableHead className="text-zinc-400">Team</TableHead>
                <TableHead className="text-zinc-400">Pos</TableHead>
                <TableHead className="text-zinc-400 text-right">Stat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaders.map((l) => (
                <TableRow key={`${l.playerId}-${l.category}`} className="border-zinc-800">
                  <TableCell className="text-zinc-300">{l.rank}</TableCell>
                  <TableCell className="text-zinc-100">{l.player}</TableCell>
                  <TableCell>
                    <Link
                      href={`/season/${year}/team/${l.teamId}`}
                      className="text-zinc-300 hover:text-zinc-100 underline-offset-2 hover:underline"
                    >
                      {l.team}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{l.position ?? "—"}</TableCell>
                  <TableCell className="text-right text-zinc-100">{l.displayValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
