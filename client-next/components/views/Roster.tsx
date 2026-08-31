"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RosterPlayer, Team } from "@/lib/types";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { useRoster } from "@/lib/hooks/queries";
import { useActiveSeason } from "@/context/GlobalStateContext";
import { getFeatureAvailability } from "@/lib/activeSeasonFeatures";
import { PageSpinner, PageError } from "@/components/PageSpinner";
import { UnavailableFeature } from "@/components/UnavailableFeature";
import { PlayerCard } from "../cards/PlayerCard";

function fullName(p: RosterPlayer): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.id;
}

type RosterProps = {
  teamId: string;
  season: string;
  team?: Team;
};

export function Roster({ teamId, season, team }: RosterProps) {
  const seasonNum = season ? Number(season) : undefined;
  const activeSeason = useActiveSeason();
  const availability = getFeatureAvailability("roster", seasonNum, activeSeason);
  const { data: roster = [], isLoading, isError } = useRoster(
    teamId,
    seasonNum,
    availability.enabled
  );
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"number" | "name">("number");

  const positionOptions = useMemo(() => {
    const unique = new Set<string>();
    roster.forEach((p) => {
      if (p.position) unique.add(p.position);
    });
    return Array.from(unique).sort();
  }, [roster]);

  const sortedAndFiltered = useMemo(() => {
    if (!roster.length) return [];
    let result = [...roster];
    if (positionFilter !== "all") {
      result = result.filter((p) => p.position === positionFilter);
    }
    if (sortMode === "number") {
      result.sort((a, b) => (Number(a.jersey) || 0) - (Number(b.jersey) || 0));
    } else {
      result.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    }
    return result;
  }, [roster, sortMode, positionFilter]);

  if (!availability.enabled) {
    return <UnavailableFeature message={availability.reason ?? "Roster is unavailable."} />;
  }
  if (isLoading) return <PageSpinner heightClass="h-[30vh]" />;
  if (isError) return <PageError message="Failed to load roster." />;

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={sortMode === "number" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("number")}
            className="border-input text-xs sm:text-sm min-h-9"
          >
            <ArrowDownNarrowWide className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Number
          </Button>
          <Button
            variant={sortMode === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("name")}
            className="border-input text-xs sm:text-sm min-h-9"
          >
            <ArrowDownWideNarrow className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Name
          </Button>
        </div>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-[180px] border-input bg-card text-foreground min-h-9">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card text-foreground">
            <SelectItem value="all">All Positions</SelectItem>
            {positionOptions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {sortedAndFiltered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map((player) => (
            <PlayerCard key={player.id} player={player} variant="roster" imgSize="thumbnail" team={team} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">No roster data available.</p>
      )}
    </div>
  );
}
