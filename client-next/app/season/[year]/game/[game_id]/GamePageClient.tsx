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
import Link from "next/link";

type GamePageClientProps = {
  year: string;
  gameId: string;
};

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
    const grouped = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = grouped.get(e.team) ?? [];
      list.push(e);
      grouped.set(e.team, list);
    }
    return [...grouped.entries()];
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

  return (
    <div className="space-y-6 min-w-0">
      <GameCard game={game} year={Number(year)} />

      {!preview.completed && preview.statsYear && !Number.isNaN(seasonNum) && preview.statsYear < seasonNum && (
        <p className="text-sm text-amber-200/90 text-center">
          Preview uses {preview.statsYear} stats — {seasonNum} data not yet available.
        </p>
      )}

      {(game.completed || game.homePoints != null) && (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Team</TableHead>
                {game.awayLineScores?.map((_, i) => (
                  <TableHead key={i} className="text-center text-muted-foreground text-xs">
                    {i >= 4 ? "OT" : i + 1}
                  </TableHead>
                ))}
                <TableHead className="text-end text-muted-foreground">F</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border">
                <TableCell className="text-foreground">
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
                  <TableCell key={i} className="text-center text-foreground/80">{s}</TableCell>
                ))}
                <TableCell className="text-end font-semibold text-foreground">
                  {game.awayPoints ?? "—"}
                </TableCell>
              </TableRow>
              <TableRow className="border-border">
                <TableCell className="text-foreground">
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
                  <TableCell key={i} className="text-center text-foreground/80">{s}</TableCell>
                ))}
                <TableCell className="text-end font-semibold text-foreground">
                  {game.homePoints ?? "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {scoringPlays.length > 0 && (
        <div className="rounded-md border border-border bg-muted/50 px-4 py-3 space-y-2">
          <h5 className="text-sm font-medium text-foreground/80 text-center">Scoring Summary</h5>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs text-muted-foreground">
            {scoringPlays.map((sp) => (
              <li key={sp.id} className="flex flex-wrap gap-x-2 justify-center">
                <span className="text-foreground/80">
                  Q{sp.period}
                  {sp.clock ? ` ${sp.clock}` : ""}
                </span>
                <span className="text-foreground">{sp.team}</span>
                {sp.scoringType ? <span>{sp.scoringType}</span> : null}
                <span>{sp.text}</span>
                {sp.awayScore != null && sp.homeScore != null && (
                  <span className="text-foreground/70">
                    ({sp.awayScore}-{sp.homeScore})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {seasonStatsChart && seasonStatsChart.datasets.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground text-center">
              {preview?.statsLabel ?? "ESPN efficiency (season-to-date)"}
              {preview?.statsYear ? ` · ${preview.statsYear}` : ""}
            </p>
            <BarChart labels={seasonStatsChart.labels} datasets={seasonStatsChart.datasets} />
          </div>
        )}
        {(homeWinProb != null || spread != null) && (
          <div className="flex flex-col items-center justify-center gap-2 text-foreground">
            {homeWinProb != null && (
              <>
                <p className="text-xs text-muted-foreground">{game.homeTeam} win probability</p>
                <WinPercentage
                  logoUrl=""
                  percentage={(Number(homeWinProb) * 100).toFixed(2)}
                  size={200}
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
        )}
      </div>

      {mediaOutlets.length > 0 && (
        <p className="text-sm text-foreground/80 text-center">
          Watch on: {mediaOutlets.join(", ")}
        </p>
      )}

      {weather && !weather.gameIndoors && (
        <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground/80 text-center">
          {weather.condition?.description ?? "Weather forecast"}
          {weather.temperature != null && ` · ${weather.temperature}°F`}
          {weather.windSpeed != null && ` · Wind ${weather.windSpeed} mph`}
          {weather.precipitation != null && weather.precipitation > 0 && ` · Precip ${weather.precipitation}%`}
        </div>
      )}

      {preview.matchup && (
        <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
          <h5 className="text-sm font-medium text-foreground/80 mb-2 text-center">Series History</h5>
          <p className="text-center text-foreground">
            {preview.matchup.team1} {preview.matchup.team1Wins} – {preview.matchup.team2Wins} {preview.matchup.team2}
            {preview.matchup.ties > 0 ? ` (${preview.matchup.ties} ties)` : ""}
          </p>
          {preview.matchup.sinceSeason != null && (
            <p className="text-center text-xs text-muted-foreground mt-1">
              Series since {preview.matchup.sinceSeason} (not all-time)
            </p>
          )}
          {preview.matchup.games?.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
              {[...preview.matchup.games].slice(0, 10).map((g, i) => (
                <li key={i} className="text-center">
                  {g.season}: {g.awayTeam} {g.awayScore ?? "—"} @ {g.homeTeam} {g.homeScore ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {gameLeadersByTeam.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gameLeadersByTeam.map(([team, leaders]) => (
            <div key={team} className="rounded-md border border-border bg-card px-3 py-3 space-y-2">
              <h3 className="text-sm font-medium text-foreground/80 text-center">{team} Top Performers</h3>
              <ul className="space-y-1.5 text-sm">
                {leaders.map((l, i) => (
                  <li key={`${l.category}-${i}`} className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                    <span className="text-muted-foreground">{l.category}</span>
                    <span className="text-foreground">
                      {l.player}
                      <span className="text-muted-foreground ml-2">{l.displayValue}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {boxScoreDatasets.length > 0 && boxScoreLabels.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground/80 text-center">Team Stats</h3>
          <BarChart labels={boxScoreLabels} datasets={boxScoreDatasets} />
        </div>
      )}

      {detail?.playerStats?.[0]?.teams?.map((teamGroup, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-medium text-foreground/80">{teamGroup.team} Box Score Leaders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {(teamGroup.categories ?? []).flatMap((cat) =>
              (cat.athletes ?? []).slice(0, 1).map((a) => (
                <div
                  key={`${cat.name}-${a.id}`}
                  className="rounded border border-border bg-card px-3 py-2"
                >
                  <span className="text-muted-foreground">{cat.name}: </span>
                  <span className="text-foreground">{a.name}</span>
                  <span className="text-muted-foreground ml-2">{a.stat}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      {leadersByTeam.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leadersByTeam.map((item, idx) => (
            <div key={idx}>
              <h5 className="text-center text-foreground mb-3">{item.team} Key Players</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.statLeaders?.map((playerStats, i) => (
                  <PlayerCard
                    key={i}
                    player={playerStats.player}
                    stats={playerStats.stats}
                    variant="stat-leader"
                    imgSize="thumbnail"
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
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {drives.map((d) => (
                      <div
                        key={d.id}
                        className="rounded border border-border bg-card px-3 py-2 text-xs text-foreground/80 flex flex-wrap items-center gap-2"
                      >
                        <span>
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
                  onClick={() => setShowPlays((v) => !v)}
                >
                  {showPlays ? "Hide" : "Show"} play-by-play ({plays.length})
                </Button>
              )}
              {showPlays && (
                <div className="space-y-1 max-h-96 overflow-y-auto mt-2">
                  {plays.slice(0, 100).map((p) => (
                    <div
                      key={p.id}
                      className="text-xs text-muted-foreground border-b border-border py-1"
                    >
                      Q{p.period} {p.clock?.minutes}:
                      {String(p.clock?.seconds ?? 0).padStart(2, "0")} — {p.playText}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
