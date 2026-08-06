"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatHeightInches, formatPlayerYear, formatWeightPounds } from "@/lib/format";
import type { RosterPlayer, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Supports both roster player shape and stat-leader shape from game previews */
type PlayerCardProps = {
  player: RosterPlayer;
  stats?: {
    stat_type?: string;
    stat?: string | number;
  };
  variant: "roster" | "stat-leader";
  imgSize: "full" | "thumbnail"
  team?: Team | null;
};

const PLACEHOLDER_PIC = "/favicon.ico";

export function PlayerCard({ player, stats = {}, variant = "stat-leader", imgSize = "thumbnail", team = undefined }: PlayerCardProps) {
  const displayName = `${player.firstName} ${player.lastName}`;
  const imgDimensions = {
    width: imgSize === "full" ? "350" : "96",
    height: imgSize === "full" ? "254" : "96",
    scale: imgSize === "full" ? "" : "crop",
  };
  const espnImageUrl = (id: string) => {
    const url = `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${id}.png&w=${imgDimensions.width}&h=${imgDimensions.height}`;
    if (imgDimensions.scale === "crop") {
      return `${url}&scale=${imgDimensions.scale}`;
    }
    return url;
  };


  const imgSrc =
    variant === "roster" && player?.id ? (espnImageUrl(player.id)) : ("headshot" in player ? (player.headshot as { href?: string } | undefined)?.href ?? PLACEHOLDER_PIC : PLACEHOLDER_PIC);
  const jersey = player.jersey ?? "—";
  const position = player.position ?? "—";
  const statType = stats.stat_type ?? "Stat";
  const statValue = stats.stat ?? "—";
  const logo = team?.logos?.[0] ?? (player.team as { logo?: string } | undefined)?.logo ?? undefined;

  return (
    <Card className="overflow-hidden gap-0 py-0">
      {logo && (
        <CardHeader className="py-1 px-2 flex flex-row items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="h-6 w-auto object-contain" />
          <span className="text-xs font-medium text-foreground/80">
            #{jersey} {position !== "—" && `(${position})`}
          </span>
        </CardHeader>
      )}
      {!logo && (
        <CardHeader className="py-1 px-2">
          <span className="text-xs font-medium text-foreground/80">
            #{jersey} {position !== "—" && `(${position})`}
          </span>
        </CardHeader>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgSrc} alt="" className={cn(imgSize === "full" ? "h-48 w-full object-cover" : "h-8 w-auto object-contain")} />
      <CardContent className="p-2 text-center">
        {variant === "roster" ?
          <>
            <p className="font-medium text-sm text-foreground">{displayName}</p>
            {player?.year != null && <p className="text-xs font-semibold text-muted-foreground mt-1">{formatPlayerYear(player?.year)}</p>}
            {player?.weight != null && <p className="text-xs font-semibold text-muted-foreground mt-1">{formatWeightPounds(player?.weight)}</p>}
            {player?.height != null && <p className="text-xs text-muted-foreground">{formatHeightInches(player?.height)}</p>}
          </>
          :
          <><p className="font-medium text-sm text-foreground">{displayName}</p>
            {statType && <p className="text-xs font-semibold text-muted-foreground mt-1">{statType}</p>}
            {statValue && <p className="text-xs text-muted-foreground">{String(statValue)}</p>}
          </>
        }
      </CardContent>
    </Card>
  );
}
