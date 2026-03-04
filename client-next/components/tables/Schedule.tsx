"use client";

import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Home, MapPin } from "lucide-react";
import { WinPercentage } from "@/components/odds/WinPercentage";
import type { GameWithOdds } from "@/lib/types";
import type { Conference } from "@/lib/types";
import type { Team } from "@/lib/types";

function isHomeTeam(game: GameWithOdds, teamSchool: string | undefined) {
  return game.homeTeam === teamSchool;
}

function IconForTeam({
  game,
  teamSchool,
}: {
  game: GameWithOdds;
  teamSchool: string | undefined;
}) {
  if (game.neutralSite) return null;
  return isHomeTeam(game, teamSchool) ? (
    <Home className="h-4 w-4 inline" />
  ) : (
    <MapPin className="h-4 w-4 inline" />
  );
}

function teamWon(
  game: GameWithOdds,
  teamSchool: string | undefined
): boolean {
  if (!teamSchool) return false;
  return (
    (game.homeTeam === teamSchool && (game.homePoints ?? 0) > (game.awayPoints ?? 0)) ||
    (game.awayTeam === teamSchool && (game.awayPoints ?? 0) > (game.homePoints ?? 0))
  );
}

type ScheduleProps = {
  schedule: GameWithOdds[];
  conference?: Conference | null;
  team: Team;
  style?: { color?: string; backgroundColor?: string };
};

export function Schedule({
  schedule,
  conference,
  team,
  style = {},
}: ScheduleProps) {
  const teamSchool = team?.school;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {schedule?.map((game, index) => {
        const borderColor = game.neutralSite
          ? "border-amber-500/50"
          : isHomeTeam(game, teamSchool)
            ? "border-zinc-600"
            : "border-red-500/50";
        return (
          <Card
            key={game.id ?? index}
            className={`overflow-hidden border ${borderColor} bg-zinc-800 min-w-0`}
          >
            <CardHeader className="py-2 px-2 sm:px-3 flex flex-row justify-between items-center flex-wrap gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs sm:text-sm whitespace-nowrap">Week {game.week}</span>
                {game.conferenceGame && conference?.logo && (
                  <Image
                    src={conference.logo}
                    alt={conference.name ?? ""}
                    width={20}
                    height={20}
                    className="object-contain shrink-0 hidden sm:block"
                    unoptimized
                  />
                )}
              </div>
              <div className="text-center text-xs sm:text-sm shrink-0">
                {game.startDate ? (
                  <>
                    {new Date(game.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {new Date(game.startDate).toLocaleTimeString("en-US", {
                      timeStyle: "short",
                    })}
                  </>
                ) : (
                  "TBD"
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span className="truncate text-xs sm:text-sm">{game.venue ?? "—"}</span>
                <IconForTeam game={game} teamSchool={teamSchool} />
              </div>
            </CardHeader>
            <CardContent className="py-2 px-2 sm:px-3 overflow-x-auto">
              <Table className="min-w-[200px]">
                <TableHeader>
                  <TableRow className="border-zinc-700 hover:bg-transparent">
                    <TableHead className="w-0 p-1"></TableHead>
                    {game.homeLineScores?.length
                      ? game.homeLineScores.map((_, i) => (
                          <TableHead
                            key={i}
                            className="text-center text-[10px] sm:text-xs p-1"
                          >
                            {i >= 4 ? "OT" : i + 1}
                          </TableHead>
                        ))
                      : null}
                    <TableHead className="text-end text-[10px] sm:text-xs p-1">
                      {game.completed ? "F" : ""}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-zinc-700">
                    <TableCell className="text-xs sm:text-sm p-1 truncate max-w-[80px] sm:max-w-none">{game.awayTeam}</TableCell>
                    {game.awayLineScores?.length
                      ? game.awayLineScores.map((score, i) => (
                          <TableCell key={i} className="text-center text-xs sm:text-sm p-1">
                            {score}
                          </TableCell>
                        ))
                      : null}
                    <TableCell className="text-end font-semibold text-xs sm:text-sm p-1">
                      {game.awayPoints ?? "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-zinc-700">
                    <TableCell className="text-xs sm:text-sm p-1 truncate max-w-[80px] sm:max-w-none">{game.homeTeam}</TableCell>
                    {game.homeLineScores?.length
                      ? game.homeLineScores.map((score, i) => (
                          <TableCell key={i} className="text-center text-xs sm:text-sm p-1">
                            {score}
                          </TableCell>
                        ))
                      : null}
                    <TableCell className="text-end font-semibold text-xs sm:text-sm p-1">
                      {game.homePoints ?? "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-2 flex flex-wrap justify-center items-center gap-2">
                {game.completed && (
                  <span
                    className={`text-lg font-bold ${
                      teamWon(game, teamSchool) ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {teamWon(game, teamSchool) ? "W" : "L"}
                  </span>
                )}
                {!game.completed && game.odds?.homeWinProbability != null && (
                  <WinPercentage
                    logoUrl={team?.logos?.[0] ?? ""}
                    percentage={
                      (
                        (isHomeTeam(game, teamSchool)
                          ? (game.odds.homeWinProbability ?? 0)
                          : 1 - (game.odds.homeWinProbability ?? 0)) * 100
                    ).toFixed(2)
                    }
                    small
                    color={style?.color ?? "#71717a"}
                  />
                )}
                {game.odds?.spread != null && (
                  <span className="text-sm text-zinc-400">
                    {game.odds.spread > 0 ? `+${game.odds.spread}` : game.odds.spread}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
