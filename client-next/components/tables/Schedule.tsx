"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Home, MapPin, Tv } from "lucide-react";
import { WinPercentage } from "@/components/odds/WinPercentage";
import type { GameWithOdds } from "@/lib/types";
import type { Conference } from "@/lib/types";
import type { Team } from "@/lib/types";
import type { GameEnrichment } from "@/lib/repos/extrasRepo";
import { withAlpha } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

function isHomeTeam(game: GameWithOdds, teamSchool: string | undefined) {
  return game.homeTeam === teamSchool;
}

function teamWon(game: GameWithOdds, teamSchool: string | undefined): boolean {
  if (!teamSchool) return false;
  return (
    (game.homeTeam === teamSchool && (game.homePoints ?? 0) > (game.awayPoints ?? 0)) ||
    (game.awayTeam === teamSchool && (game.awayPoints ?? 0) > (game.homePoints ?? 0))
  );
}

function opponentName(game: GameWithOdds, teamSchool: string | undefined): string {
  return isHomeTeam(game, teamSchool) ? game.awayTeam : game.homeTeam;
}

function opponentLogo(game: GameWithOdds, teamSchool: string | undefined): string | null {
  return isHomeTeam(game, teamSchool) ? game.awayLogo ?? null : game.homeLogo ?? null;
}

function opponentRank(game: GameWithOdds, teamSchool: string | undefined): number | null {
  return isHomeTeam(game, teamSchool) ? game.awayRank ?? null : game.homeRank ?? null;
}

function teamScore(game: GameWithOdds, teamSchool: string | undefined): number | null {
  return isHomeTeam(game, teamSchool) ? game.homePoints : game.awayPoints;
}

function oppScore(game: GameWithOdds, teamSchool: string | undefined): number | null {
  return isHomeTeam(game, teamSchool) ? game.awayPoints : game.homePoints;
}

/** Midnight kickoffs are ESPN placeholders for an unset time — show TBD. */
function formatScheduleKickoff(startDate: string): string {
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "TBD";

  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const isMidnightPlaceholder = d.getHours() === 0 && d.getMinutes() === 0;
  if (isMidnightPlaceholder) return `${date} · TBD`;

  return `${date} · ${d.toLocaleTimeString("en-US", { timeStyle: "short" })}`;
}

type ScheduleProps = {
  schedule: GameWithOdds[];
  conference?: Conference | null;
  team: Team;
  style?: { color?: string; backgroundColor?: string };
  season?: string;
  enrichmentByGameId?: Map<number, GameEnrichment>;
};

export function Schedule({
  schedule,
  conference,
  team,
  style = {},
  season,
  enrichmentByGameId,
}: ScheduleProps) {
  const teamSchool = team?.school;
  const completed = schedule.filter((g) => g.completed);
  const upcoming = schedule.filter((g) => !g.completed);
  const next = upcoming[0] ?? null;
  const later = upcoming.slice(1);

  return (
    <div className="space-y-6 min-w-0">
      {schedule.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {schedule.map((game) => {
            const done = game.completed;
            const won = done && teamWon(game, teamSchool);
            return (
              <span
                key={game.id}
                title={`Week ${game.week}: ${opponentName(game, teamSchool)}`}
                className={cn(
                  "inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded text-[11px] font-semibold",
                  !done && "bg-muted text-muted-foreground"
                )}
                style={
                  done
                    ? {
                        backgroundColor: withAlpha(won ? "#16a34a" : "#dc2626", 0.18),
                        color: won ? "#16a34a" : "#dc2626",
                      }
                    : undefined
                }
              >
                {done ? (won ? "W" : "L") : game.week || "—"}
              </span>
            );
          })}
        </div>
      )}

      {next && season && (
        <NextGameHero
          game={next}
          teamSchool={teamSchool}
          teamLogo={team?.logos?.[0] ?? ""}
          conference={conference}
          style={style}
          season={season}
          enrichment={next.id ? enrichmentByGameId?.get(next.id) : undefined}
        />
      )}

      {later.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground/80">Upcoming</h3>
          <div className="space-y-2">
            {later.map((game) => (
              <ScheduleRow
                key={game.id}
                game={game}
                teamSchool={teamSchool}
                conference={conference}
                style={style}
                season={season}
                enrichment={game.id ? enrichmentByGameId?.get(game.id) : undefined}
                variant="upcoming"
              />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground/80">Results</h3>
          <div className="space-y-2">
            {[...completed].reverse().map((game) => (
              <ScheduleRow
                key={game.id}
                game={game}
                teamSchool={teamSchool}
                conference={conference}
                style={style}
                season={season}
                enrichment={game.id ? enrichmentByGameId?.get(game.id) : undefined}
                variant="result"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NextGameHero({
  game,
  teamSchool,
  teamLogo,
  conference,
  style,
  season,
  enrichment,
}: {
  game: GameWithOdds;
  teamSchool: string | undefined;
  teamLogo: string;
  conference?: Conference | null;
  style: { color?: string; backgroundColor?: string };
  season: string;
  enrichment?: GameEnrichment;
}) {
  const primary = style.color ?? "#71717a";
  const opp = opponentName(game, teamSchool);
  const logo = opponentLogo(game, teamSchool);
  const rank = opponentRank(game, teamSchool);
  const home = isHomeTeam(game, teamSchool);
  const odds = game.odds ?? enrichment?.odds;
  const spread = odds?.spread ?? enrichment?.lines?.lines?.[0]?.spread;
  const tv = game.broadcast ?? enrichment?.media?.[0]?.outlet;

  return (
    <Link href={`/season/${season}/game/${game.id}`} className="block">
      <Card
        className="overflow-hidden border-2 hover:bg-accent/60 transition-colors"
        style={{ borderColor: withAlpha(primary, 0.55) }}
      >
        <div className="h-1 w-full" style={{ backgroundColor: primary }} />
        <CardContent className="p-4 sm:p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Next · Week {game.week}
            {game.conferenceGame && conference?.name ? ` · ${conference.shortName ?? conference.name}` : ""}
          </div>
          <div className="flex items-center gap-4">
            {logo ? (
              <Image src={logo} alt="" width={56} height={56} className="object-contain" unoptimized />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-foreground truncate">
                {rank ? `#${rank} ` : ""}
                {opp}
              </div>
              <div className="text-sm text-muted-foreground">
                {home ? "Home" : game.neutralSite ? "Neutral" : "Away"}
                {game.venue?.name ? ` · ${game.venue.name}` : ""}
              </div>
              <div className="text-sm text-foreground mt-1">
                {game.startDate ? formatScheduleKickoff(game.startDate) : "TBD"}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
              {tv && (
                <span className="inline-flex items-center gap-1">
                  <Tv className="h-3.5 w-3.5" />
                  {tv}
                </span>
              )}
              {home ? <Home className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {odds?.homeWinProbability != null && (
              <WinPercentage
                logoUrl={teamLogo}
                percentage={(
                  (isHomeTeam(game, teamSchool)
                    ? (odds.homeWinProbability ?? 0)
                    : 1 - (odds.homeWinProbability ?? 0)) * 100
                ).toFixed(1)}
                small
                color={primary}
              />
            )}
            {spread != null && (
              <span className="text-sm text-muted-foreground">{spread > 0 ? `+${spread}` : spread}</span>
            )}
            {enrichment?.lines?.lines?.[0]?.overUnder != null && (
              <span className="text-xs text-muted-foreground">
                O/U {enrichment.lines.lines[0].overUnder}
              </span>
            )}
            {enrichment?.weather && !enrichment.weather.gameIndoors && enrichment.weather.temperature != null && (
              <span className="text-xs text-muted-foreground">{enrichment.weather.temperature}°F</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ScheduleRow({
  game,
  teamSchool,
  conference,
  style,
  season,
  enrichment,
  variant,
}: {
  game: GameWithOdds;
  teamSchool: string | undefined;
  conference?: Conference | null;
  style: { color?: string; backgroundColor?: string };
  season?: string;
  enrichment?: GameEnrichment;
  variant: "upcoming" | "result";
}) {
  const primary = style.color ?? "#71717a";
  const opp = opponentName(game, teamSchool);
  const logo = opponentLogo(game, teamSchool);
  const rank = opponentRank(game, teamSchool);
  const home = isHomeTeam(game, teamSchool);
  const won = variant === "result" && teamWon(game, teamSchool);
  const us = teamScore(game, teamSchool);
  const them = oppScore(game, teamSchool);
  const margin = us != null && them != null ? us - them : null;
  const tv = game.broadcast ?? enrichment?.media?.[0]?.outlet;
  const inner = (
    <Card className="hover:bg-accent/50 transition-colors border-border">
      <CardContent className="p-3 flex items-center gap-3">
        {logo ? (
          <Image src={logo} alt="" width={32} height={32} className="object-contain shrink-0" unoptimized />
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
            <span className="text-xs text-muted-foreground w-10 shrink-0">
              {home ? "vs" : "@"}
            </span>
            <span className="truncate">
              {rank ? `#${rank} ` : ""}
              {opp}
            </span>
            {game.conferenceGame && conference?.logo && (
              <Image
                src={conference.logo}
                alt=""
                width={16}
                height={16}
                className="object-contain hidden sm:inline"
                unoptimized
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            Week {game.week}
            {game.startDate ? ` · ${formatScheduleKickoff(game.startDate)}` : ""}
            {variant === "upcoming" && tv ? ` · ${tv}` : ""}
            {variant === "result" && game.homeLineScores?.length
              ? ` · ${game.homeLineScores.length > 4 ? "OT" : `${game.homeLineScores.length}Q`}`
              : ""}
          </div>
        </div>
        {variant === "result" ? (
          <div className="text-right shrink-0">
            <div
              className="text-sm font-semibold"
              style={{ color: won ? "#16a34a" : "#dc2626" }}
            >
              {won ? "W" : "L"} {us}–{them}
            </div>
            {margin != null && (
              <div className="text-[11px] text-muted-foreground">
                {margin > 0 ? "+" : ""}
                {margin}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
            {game.venue?.name ?? ""}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (season && game.id) {
    return (
      <Link href={`/season/${season}/game/${game.id}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
