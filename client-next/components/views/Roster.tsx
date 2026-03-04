"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoster } from "@/lib/repos";
import type { RosterPlayer } from "@/lib/types";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";

function fullName(p: RosterPlayer): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.id;
}

type RosterProps = {
  id: number;
  season: string;
};

export function Roster({ id, season }: RosterProps) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
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

  useEffect(() => {
    if (!id) return;
    const year = season ? Number(season) : undefined;
    getRoster(String(id), year).then(setRoster).catch(() => setRoster([]));
  }, [id, season]);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={sortMode === "number" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("number")}
            className="border-zinc-600 text-xs sm:text-sm min-h-9"
          >
            <ArrowDownNarrowWide className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Number
          </Button>
          <Button
            variant={sortMode === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortMode("name")}
            className="border-zinc-600 text-xs sm:text-sm min-h-9"
          >
            <ArrowDownWideNarrow className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Name
          </Button>
        </div>
        <Select
          value={positionFilter}
          onValueChange={setPositionFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px] border-zinc-600 bg-zinc-800 text-zinc-100 min-h-9">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-800 text-zinc-100">
            <SelectItem value="all">All Positions</SelectItem>
            {positionOptions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {sortedAndFiltered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map((player) => (
            <Card
              key={player.id}
              className="border-zinc-700 bg-zinc-800 overflow-hidden"
            >
              <CardContent className="p-4 flex gap-3">
                <div
                  className="shrink-0 w-14 h-14 rounded bg-zinc-700 flex items-center justify-center text-zinc-100 font-medium"
                >
                  #{player.jersey ?? "—"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-100 truncate">
                    {fullName(player)}
                  </p>
                  <p className="text-sm text-zinc-400">
                    #{player.jersey ?? "—"} • {player.position ?? "—"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {player.height != null ? `${player.height}"` : "—"} •{" "}
                    {player.weight != null ? `${player.weight} lbs` : "—"}
                  </p>
                  {player.year != null && (
                    <p className="text-xs text-zinc-500">
                      Year: {player.year}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
