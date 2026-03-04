"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";

/** Supports both roster player shape and stat-leader shape from NextMatchup */
type PlayerCardProps = {
  player: {
    fullName?: string;
    name?: string;
    displayName?: string;
    headshot?: { href?: string; alt?: string };
    jersey?: number | string | null;
    position?: string | { abbreviation?: string } | null;
    team?: { logo?: string };
  };
  stats: {
    stat_type?: string;
    stat?: string | number;
  };
};

const PLACEHOLDER_PIC =
  "https://ttwo.dk/wp-content/uploads/2017/08/person-placeholder.jpg";

export function PlayerCard({ player, stats }: PlayerCardProps) {
  const displayName =
    player.fullName ?? player.displayName ?? player.name ?? "—";
  const imgSrc =
    (player.headshot as { href?: string } | undefined)?.href ?? PLACEHOLDER_PIC;
  const jersey = player.jersey ?? "—";
  const position =
    typeof player.position === "object"
      ? player.position?.abbreviation ?? "—"
      : player.position ?? "—";
  const statType = stats.stat_type ?? "Stat";
  const statValue = stats.stat ?? "—";

  return (
    <Card className="overflow-hidden border-zinc-700 bg-zinc-800">
      {player.team?.logo && (
        <CardHeader className="py-1 px-2 flex flex-row items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={player.team.logo}
            alt=""
            className="h-6 w-auto object-contain"
          />
          <span className="text-xs font-medium text-zinc-300">
            #{jersey} {position !== "—" && `(${position})`}
          </span>
        </CardHeader>
      )}
      {!player.team?.logo && (
        <CardHeader className="py-1 px-2">
          <span className="text-xs font-medium text-zinc-300">
            #{jersey} {position !== "—" && `(${position})`}
          </span>
        </CardHeader>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        className="w-full h-32 object-cover"
      />
      <CardContent className="p-2 text-center">
        <p className="font-medium text-sm text-zinc-100">{displayName}</p>
        <p className="text-xs font-semibold text-zinc-400 mt-1">{statType}</p>
        <p className="text-xs text-zinc-500">{String(statValue)}</p>
      </CardContent>
    </Card>
  );
}
