"use client";

import { useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useLeaders } from "@/lib/hooks/queries";
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
        <h1 className="text-xl font-semibold text-foreground">National Leaders</h1>
        <p className="text-sm text-muted-foreground">
          {dataSeason && dataSeason !== seasonNum
            ? `Showing ${dataSeason} leaders (current season not yet populated).`
            : `${year} statistical leaders.`}
        </p>
      </div>

      {categories.length > 0 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1}
          value={active}
          onValueChange={(v) => {
            if (v) setCategory(v);
          }}
          className="flex flex-wrap justify-center w-full max-w-full"
        >
          {categories.map((c) => (
            <ToggleGroupItem key={c} value={c} className="text-xs">
              {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {isLoading ? (
        <PageSpinner heightClass="h-[40vh]" />
      ) : isError ? (
        <PageError message="Failed to load leaders." />
      ) : !leaders.length ? (
        <p className="text-center text-muted-foreground py-8">
          Leaders are not available for this season yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Pos</TableHead>
                <TableHead className="text-right">Stat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaders.map((l) => (
                <TableRow key={`${l.playerId}-${l.category}`}>
                  <TableCell className="text-foreground/80">{l.rank}</TableCell>
                  <TableCell>{l.player}</TableCell>
                  <TableCell>
                    <Link
                      href={`/season/${year}/team/${l.teamId}`}
                      className="text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
                    >
                      {l.team}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.position ?? "—"}</TableCell>
                  <TableCell className="text-right">{l.displayValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
