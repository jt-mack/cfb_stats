"use client";

import { useMemo, useState } from "react";
import { useGameDrives, useGamePreview } from "@/lib/hooks/queries";
import { normalizeEspnDrive, normalizeEspnPlay } from "@/lib/format";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { BarChart } from "@/components/charts/BarChart";
import { WinPercentage } from "@/components/odds/WinPercentage";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameCard } from "@/components/cards/GameCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import type { GamePreview, RosterPlayer } from "@/lib/types";
import { athletePath } from "@/lib/athlete";

type GamePageClientProps = {
  year: string;
  gameId: string;
};

type GameLeader = NonNullable<GamePreview["gameLeaders"]>[number];

function toRosterPlayer(leader: GameLeader): RosterPlayer {
  const [firstName, ...rest] = leader.player.split(" ");
  return {
    id: leader.playerId ?? "",
    firstName: firstName ?? leader.player,
    lastName: rest.join(" "),
    team: leader.team,
    height: null,
    weight: null,
    jersey: null,
    year: 0,
    position: leader.position ?? null,
  };
}

export default function GamePageClient({ year, gameId }: GamePageClientProps) {
  const [playByPlayRequested, setPlayByPlayRequested] = useState(false);
  const [showPlays, setShowPlays] = useState(false);

  const seasonNum = Number(year);
  const id = Number(gameId);
  const validId = !Number.isNaN(id);
  const validSeason = !Number.isNaN(seasonNum);

  const {
    data: preview,
    isLoading,
    isError,
    error,
  } = useGamePreview(validId ? id : undefined, validSeason ? seasonNum : undefined);

  const canLoadPlayByPlay = Boolean(preview?.completed && preview.game);
  const loadPlayByPlay = playByPlayRequested && canLoadPlayByPlay;
  const { data: drivesRaw, isLoading: drivesLoading } = useGameDrives(
    validId ? id : undefined,
    loadPlayByPlay
  );
  const playByPlayLoading = loadPlayByPlay && drivesLoading;

  const drives = useMemo(() => {
    if (!preview?.game || !Array.isArray(drivesRaw) || !drivesRaw.length) return [];
    return drivesRaw.map((drive) =>
      normalizeEspnDrive(drive, preview.game!.homeTeam, preview.game!.awayTeam)
    );
  }, [drivesRaw, preview?.game]);

  // Plays are nested on each drive — no separate /plays request.
  const plays = useMemo(() => {
    if (!Array.isArray(drivesRaw) || !drivesRaw.length) return [];
    return drivesRaw.flatMap((drive) => {
      const nested = (drive as { plays?: Record<string, unknown>[] }).plays;
      return Array.isArray(nested) ? nested.map(normalizeEspnPlay) : [];
    });
  }, [drivesRaw]);

  const seasonStatsChart = useMemo(() => {
    if (!preview?.advancedSeasonStats?.length) return null;
    const labels = ["Off Efficiency", "Def Efficiency"];
    const datasets = preview.advancedSeasonStats.slice(0, 2).map((s) => ({
      label: s.team,
      data: [s.offenseEfficiency ?? 0, s.defenseEfficiency ?? 0],
      backgroundColor: s.color ?? undefined,
      borderColor: s.alternateColor ?? s.color ?? undefined,
    }));
    return { labels, datasets };
  }, [preview?.advancedSeasonStats]);

  const leadersByTeam = useMemo(() => {
    if (!preview?.playerSeasonStats?.length) return [];
    const grouped = new Map<string, typeof preview.playerSeasonStats>();
    for (const p of preview.playerSeasonStats) {
      const list = grouped.get(p.team) ?? [];
      list.push(p);
      grouped.set(p.team, list);
    }
    return [...grouped.entries()].map(([team, stats]) => ({
      team,
      statLeaders: stats.map((s) => ({
        player: s.player,
        stats: { stat_type: s.statType, stat: s.stat },
      })),
    }));
  }, [preview?.playerSeasonStats]);

  const gameLeadersByTeam = useMemo(() => {
    const entries = preview?.gameLeaders ?? [];
    if (!entries.length) return [];
    const grouped = new Map<string, GameLeader[]>();
    for (const e of entries) {
      const list = grouped.get(e.team) ?? [];
      list.push(e);
      grouped.set(e.team, list);
    }
    return [...grouped.entries()].map(([team, leaders]) => {
      const byPlayer = new Map<string, GameLeader[]>();
      for (const leader of leaders) {
        const key = leader.playerId || leader.player;
        const list = byPlayer.get(key) ?? [];
        list.push(leader);
        byPlayer.set(key, list);
      }
      return [team, [...byPlayer.values()]] as const;
    });
  }, [preview?.gameLeaders]);

  if (!validId) {
    return <div className="py-8 text-center text-muted-foreground">Invalid game id</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (isError && !preview?.game) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {error instanceof Error ? error.message : "Failed to load game"}
      </div>
    );
  }

  if (!preview?.game) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Game preview unavailable. Data may still be loading from ESPN.
      </div>
    );
  }

  const game = preview.game;
  const detail = preview.detail;
  const teamStatsEntry = detail?.teamStats?.[0];
  const teams = teamStatsEntry?.teams ?? [];

  const boxScoreLabels = teams[0]?.stats?.map((s) => s.category) ?? [];
  const boxScoreDatasets = teams.map((t) => ({
    label: t.team,
    data: (t.stats ?? []).map((s) => parseFloat(s.stat) || 0),
    backgroundColor: t.color ?? undefined,
    borderColor: t.alternateColor ?? t.color ?? undefined,
  }));

  const homeTeamStats = teams.find((t) => t.homeAway === "home");
  const homeFromAdv = preview.advancedSeasonStats?.find((s) => s.team === game.homeTeam);
  const homeColor = homeTeamStats?.color ?? homeFromAdv?.color ?? "#71717a";
  const homeWinProb = preview.odds?.homeWinProbability ?? null;
  const spread = preview.odds?.spread ?? preview.lines?.lines?.[0]?.spread ?? null;
  const overUnder = preview.lines?.lines?.[0]?.overUnder;
  const mediaOutlets = preview.media?.map((m) => m.outlet).filter(Boolean) ?? [];
  const weather = preview.weather;
  const scoringPlays = preview.scoringPlays ?? [];

  const teamCellClass =
    "sticky left-0 z-10 max-w-[7.5rem] truncate bg-background px-2 text-foreground group-hover:bg-muted sm:max-w-none";
  const scoreCellClass = "px-1.5 text-center text-foreground/80 sm:px-2";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <GameCard
        game={game}
        year={Number(year)}
        mediaOutlets={mediaOutlets}
        weather={weather}
      />

      {!preview.completed && preview.statsYear && !Number.isNaN(seasonNum) && preview.statsYear < seasonNum && (
        <p className="text-center text-xs text-amber-200/90 sm:text-sm">
          Preview uses {preview.statsYear} stats — {seasonNum} data not yet available.
        </p>
      )}

      {(game.completed || game.homePoints != null) && (
        <div className="rounded-md border border-border">
          <Table className="text-xs sm:text-sm">
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className={`${teamCellClass} text-muted-foreground`}>Team</TableHead>
                {game.awayLineScores?.map((_, i) => (
                  <TableHead key={i} className="px-1.5 text-center text-xs text-muted-foreground sm:px-2">
                    {i >= 4 ? "OT" : i + 1}
                  </TableHead>
                ))}
                <TableHead className="px-1.5 text-end text-muted-foreground sm:px-2">F</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="group border-border">
                <TableCell className={teamCellClass}>
                  {game.awayTeamId != null ? (
                    <Link
                      href={`/season/${year}/team/${game.awayTeamId}/overview`}
                      className="hover:underline underline-offset-2"
                    >
                      {game.awayTeam}
                    </Link>
                  ) : (
                    game.awayTeam
                  )}
                </TableCell>
                {game.awayLineScores?.map((s, i) => (
                  <TableCell key={i} className={scoreCellClass}>{s}</TableCell>
                ))}
                <TableCell className="px-1.5 text-end font-semibold text-foreground sm:px-2">
                  {game.awayPoints ?? "—"}
                </TableCell>
              </TableRow>
              <TableRow className="group border-border">
                <TableCell className={teamCellClass}>
                  {game.homeTeamId != null ? (
                    <Link
                      href={`/season/${year}/team/${game.homeTeamId}/overview`}
                      className="hover:underline underline-offset-2"
                    >
                      {game.homeTeam}
                    </Link>
                  ) : (
                    game.homeTeam
                  )}
                </TableCell>
                {game.homeLineScores?.map((s, i) => (
                  <TableCell key={i} className={scoreCellClass}>{s}</TableCell>
                ))}
                <TableCell className="px-1.5 text-end font-semibold text-foreground sm:px-2">
                  {game.homePoints ?? "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {scoringPlays.length > 0 && (
            <div className="flex justify-center border-t border-border px-3 py-2 sm:px-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
                    View Scoring Plays
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Scoring Plays</DialogTitle>
                    <DialogDescription>
                      {game.awayTeam} at {game.homeTeam}
                    </DialogDescription>
                  </DialogHeader>
                  <ul className="max-h-[60vh] space-y-2 overflow-y-auto text-sm text-muted-foreground">
                    {scoringPlays.map((sp) => (
                      <li key={sp.id} className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-foreground/80">
                            Q{sp.period}
                            {sp.clock ? ` ${sp.clock}` : ""}
                            {sp.scoringType ? ` · ${sp.scoringType}` : ""}
                          </span>
                          {sp.awayScore != null && sp.homeScore != null && (
                            <span className="shrink-0 font-medium text-foreground/70">
                              {sp.awayScore}–{sp.homeScore}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">{sp.team}</p>
                        <p className="leading-snug">{sp.text}</p>
                      </li>
                    ))}
                  </ul>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
        {seasonStatsChart && seasonStatsChart.datasets.length > 0 && (
          <div className="min-w-0 space-y-1">
            <p className="text-center text-xs text-muted-foreground">
              {preview?.statsLabel ?? "ESPN efficiency (season-to-date)"}
              {preview?.statsYear ? ` · ${preview.statsYear}` : ""}
            </p>
            <BarChart labels={seasonStatsChart.labels} datasets={seasonStatsChart.datasets} />
          </div>
        )}
        {(homeWinProb != null || spread != null) ? (
          <div className="flex flex-col items-center justify-center gap-2 text-foreground">
            {homeWinProb != null && (
              <>
                <p className="px-2 text-center text-xs text-muted-foreground">{game.homeTeam} win probability</p>
                <WinPercentage
                  logoUrl=""
                  percentage={(Number(homeWinProb) * 100).toFixed(2)}
                  size={160}
                  color={homeColor}
                />
              </>
            )}
            {spread != null && (
              <h4 className="text-xl font-semibold">
                {spread > 0 ? `+${spread}` : spread}
              </h4>
            )}
            {overUnder != null && (
              <p className="text-sm text-muted-foreground">O/U {overUnder}</p>
            )}
          </div>
        ) : boxScoreDatasets.length > 0 && boxScoreLabels.length > 0 && (
          <div className="min-w-0 space-y-2">
            <h3 className="text-center text-sm font-medium text-foreground/80">Team Stats</h3>
            <BarChart labels={boxScoreLabels} datasets={boxScoreDatasets} />
          </div>
        )}
      </div>

      {game.completed && gameLeadersByTeam.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {gameLeadersByTeam.map(([team, players]) => (
            <div key={team} className="min-w-0 space-y-2 rounded-md border border-border bg-card px-3 py-3">
              <h3 className="text-center text-sm font-medium text-foreground/80">{team} Top Performers</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {players.map((entries) => (
                  <PlayerCard
                    key={entries[0].playerId || entries[0].player}
                    player={toRosterPlayer(entries[0])}
                    variant="stat-leader"
                    imgSize="thumbnail"
                    href={athletePath(year, entries[0].playerId)}
                  >
                    <dl className="mt-2 space-y-1">
                      {entries.map((e) => (
                        <div key={e.category} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                          <dt className="text-muted-foreground">{e.category}</dt>
                          <dd className="font-semibold break-words text-foreground">{e.displayValue}</dd>
                        </div>
                      ))}
                    </dl>
                  </PlayerCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!game.completed && leadersByTeam.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
          {leadersByTeam.map((item, idx) => (
            <div key={idx} className="min-w-0">
              <h5 className="mb-3 text-center text-foreground">{item.team} Key Players</h5>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.statLeaders?.map((playerStats, i) => (
                  <PlayerCard
                    key={i}
                    player={playerStats.player}
                    stats={playerStats.stats}
                    variant="stat-leader"
                    imgSize="thumbnail"
                    href={athletePath(year, playerStats.player.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canLoadPlayByPlay && (
        <div className="space-y-2">
          {!playByPlayRequested ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setPlayByPlayRequested(true)}
            >
              View play by play
            </Button>
          ) : playByPlayLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <span className="text-sm text-muted-foreground">Loading play by play…</span>
            </div>
          ) : drives.length === 0 && plays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Play-by-play unavailable for this game.</p>
          ) : (
            <>
              {drives.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-foreground/80">Drives</h3>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {drives.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center gap-2 rounded border border-border bg-card px-3 py-2 text-xs text-foreground/80"
                      >
                        <span className="min-w-0 break-words">
                          <span className="text-foreground">{d.offense}</span> vs {d.defense} —{" "}
                          {d.yards} yds, {d.plays} plays
                        </span>
                        {d.scoring ? <Badge variant="secondary">SCORE</Badge> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {plays.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowPlays((v) => !v)}
                >
                  {showPlays ? "Hide" : "Show"} play-by-play ({plays.length})
                </Button>
              )}
              {showPlays && (
                <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
                  {plays.slice(0, 100).map((p) => (
                    <div
                      key={p.id}
                      className="border-b border-border py-1.5 text-xs leading-snug text-muted-foreground"
                    >
                      <span className="text-foreground/80">
                        Q{p.period} {p.clock?.minutes}:
                        {String(p.clock?.seconds ?? 0).padStart(2, "0")}
                      </span>
                      {" — "}
                      {p.playText}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {preview.matchup && (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-3 sm:px-4">
          <h5 className="mb-2 text-center text-sm font-medium text-foreground/80">Series History</h5>
          <p className="text-center text-sm text-foreground sm:text-base">
            {preview.matchup.team1} {preview.matchup.team1Wins} – {preview.matchup.team2Wins} {preview.matchup.team2}
            {preview.matchup.ties > 0 ? ` (${preview.matchup.ties} ties)` : ""}
          </p>
          {preview.matchup.sinceSeason != null && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Series since {preview.matchup.sinceSeason} (not all-time)
            </p>
          )}
          {preview.matchup.games?.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {[...preview.matchup.games].slice(0, 10).map((g, i) => (
                <li key={i} className="text-center break-words">
                  {g.season}: {g.awayTeam} {g.awayScore ?? "—"} @ {g.homeTeam} {g.homeScore ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
