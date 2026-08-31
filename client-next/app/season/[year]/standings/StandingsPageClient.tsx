"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSeasonParams } from "@/lib/hooks/useSeasonParams";
import { useConferences, useFbsStandings, useStandings } from "@/lib/hooks/queries";
import { StandingsTable } from "@/components/tables/StandingsTable";
import type { StandingsRow } from "@/components/tables/StandingsTable";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function StandingsPageClient() {
  const { year, seasonNum, isValidSeason } = useSeasonParams();
  const { data: conferences = [] } = useConferences();
  const [view, setView] = useState<"conference" | "fbs">("conference");
  const fbsConfs = useMemo(
    () => conferences.filter((c) => c.classification === "fbs" && c.id !== 80),
    [conferences]
  );
  const [confId, setConfId] = useState<string>("8");

  const { data: confRecords = [], isLoading: confLoading, isError: confError } = useStandings(
    view === "conference" ? confId : undefined,
    seasonNum
  );
  const { data: fbsRecords = [], isLoading: fbsLoading, isError: fbsError } = useFbsStandings(
    view === "fbs" ? seasonNum : undefined
  );

  const records = view === "fbs" ? fbsRecords : confRecords;
  const standings: StandingsRow[] = records.map((rec) => ({
    name: rec.team,
    id: rec.teamId,
    logo: rec.logo ?? "",
    record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : "—",
    conferenceRecord: rec.conferenceGames
      ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}`
      : "—",
  }));

  if (!year || !isValidSeason) return <PageError message="Invalid route." />;

  const loading = view === "fbs" ? fbsLoading : confLoading;
  const error = view === "fbs" ? fbsError : confError;

  return (
    <div className="space-y-4 min-w-0">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{year} Standings</h1>
        <p className="text-sm text-muted-foreground">
          {view === "fbs"
            ? "FBS record listing — not an official national ranking."
            : "Conference standings by overall and conference record."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center items-center">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          onValueChange={(v) => {
            if (v === "conference" || v === "fbs") setView(v);
          }}
        >
          <ToggleGroupItem value="conference">Conference</ToggleGroupItem>
          <ToggleGroupItem value="fbs">FBS listing</ToggleGroupItem>
        </ToggleGroup>
        {view === "conference" && (
          <Select value={confId} onValueChange={setConfId}>
            <SelectTrigger className="w-[200px]" aria-label="Select conference">
              <SelectValue placeholder="Conference" />
            </SelectTrigger>
            <SelectContent>
              {fbsConfs.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {view === "conference" && (
          <Button variant="link" size="sm" asChild>
            <Link href={`/season/${year}/conference/${confId}`}>Conference page →</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <PageSpinner heightClass="h-[40vh]" />
      ) : error ? (
        <PageError message="Failed to load standings." />
      ) : (
        <StandingsTable standings={standings} season={year} />
      )}
    </div>
  );
}
