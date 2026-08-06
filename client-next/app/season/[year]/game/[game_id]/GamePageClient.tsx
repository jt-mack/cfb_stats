"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGameDrives, useGamePlays, useGamePreview } from "@/lib/hooks/queries";
import { normalizeEspnDrive, normalizeEspnPlay } from "@/lib/format";
import { formatSeasonDate } from "@/lib/seasonHelpers";
import { ImageCard } from "@/components/cards/ImageCard";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { BarChart } from "@/components/charts/BarChart";
import { WinPercentage } from "@/components/odds/WinPercentage";
import { Skeleton } from "@/components/ui/skeleton";
import { VenueCard } from "@/components/cards/VenueCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameCard } from "@/components/cards/GameCard";

type GamePageClientProps = {
  year: string;
  gameId: string;
};

export default function GamePageClient({ year, gameId }: GamePageClientProps) {
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

  const loadPlayByPlay = Boolean(preview?.completed && preview.game);
  const { data: drivesRaw = [] } = useGameDrives(validId ? id : undefined, loadPlayByPlay);
  const { data: playsRaw = [] } = useGamePlays(validId ? id : undefined, loadPlayByPlay);

  const drives = useMemo(() => {
    if (!preview?.game || !drivesRaw.length) return [];
    return drivesRaw.map((drive) =>
      normalizeEspnDrive(drive, preview.game!.homeTeam, preview.game!.awayTeam)
    );
  }, [drivesRaw, preview?.game]);

  const plays = useMemo(() => playsRaw.map(normalizeEspnPlay), [playsRaw]);

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
        player: {
          id: s.playerId,
          name: s.player,
          displayName: s.player,
          fullName: s.player,
          jersey: s.jersey ?? undefined,
          position: s.position,
          team: s.teamLogo ? { logo: s.teamLogo } : undefined,
        },
        stats: { stat_type: s.statType, stat: s.stat },
      })),
    }));
  }, [preview?.playerSeasonStats]);

  if (!validId) {
    return <div className="py-8 text-center text-zinc-400">Invalid game id</div>;
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
      <div className="py-8 text-center text-zinc-400">
        {error instanceof Error ? error.message : "Failed to load game"}
      </div>
    );
  }

  if (!preview?.game) {
    return (
      <div className="py-8 text-center text-zinc-400">
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

  console.log({ game, preview })

  return (
    <div className="space-y-6 min-w-0">
      <GameCard game={game} year={Number(year)} />

      {!preview.completed && preview.statsYear && !Number.isNaN(seasonNum) && preview.statsYear < seasonNum && (
        <p className="text-sm text-amber-200/90 text-center">
          Preview uses {preview.statsYear} stats — {seasonNum} data not yet available.
        </p>
      )}

      {(game.completed || game.homePoints != null) && (
        <div className="rounded-md border border-zinc-700 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700">
                <TableHead className="text-zinc-400">Team</TableHead>
                {game.awayLineScores?.map((_, i) => (
                  <TableHead key={i} className="text-center text-zinc-400 text-xs">
                    {i >= 4 ? "OT" : i + 1}
                  </TableHead>
                ))}
                <TableHead className="text-end text-zinc-400">F</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-700">
                <TableCell className="text-zinc-100">{game.awayTeam}</TableCell>
                {game.awayLineScores?.map((s, i) => (
                  <TableCell key={i} className="text-center text-zinc-300">{s}</TableCell>
                ))}
                <TableCell className="text-end font-semibold text-zinc-100">
                  {game.awayPoints ?? "—"}
                </TableCell>
              </TableRow>
              <TableRow className="border-zinc-700">
                <TableCell className="text-zinc-100">{game.homeTeam}</TableCell>
                {game.homeLineScores?.map((s, i) => (
                  <TableCell key={i} className="text-center text-zinc-300">{s}</TableCell>
                ))}
                <TableCell className="text-end font-semibold text-zinc-100">
                  {game.homePoints ?? "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

        {seasonStatsChart && seasonStatsChart.datasets.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 text-center">
              {preview?.statsLabel ?? "ESPN efficiency (season-to-date)"}
              {preview?.statsYear ? ` · ${preview.statsYear}` : ""}
            </p>
            <BarChart labels={seasonStatsChart.labels} datasets={seasonStatsChart.datasets} />
          </div>
        )}
        {(homeWinProb != null || spread != null) && (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-100">
            {homeWinProb != null && (
              <>
                <p className="text-xs text-zinc-400">{game.homeTeam} win probability</p>
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
              <p className="text-sm text-zinc-400">O/U {overUnder}</p>
            )}
          </div>
        )}
      </div>

      {mediaOutlets.length > 0 && (
        <p className="text-sm text-zinc-300 text-center">
          Watch on: {mediaOutlets.join(", ")}
        </p>
      )}

      {weather && !weather.gameIndoors && (
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300 text-center">
          {weather.condition?.description ?? "Weather forecast"}
          {weather.temperature != null && ` · ${weather.temperature}°F`}
          {weather.windSpeed != null && ` · Wind ${weather.windSpeed} mph`}
          {weather.precipitation != null && weather.precipitation > 0 && ` · Precip ${weather.precipitation}"`}
        </div>
      )}

      {preview.matchup && (
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
          <h5 className="text-sm font-medium text-zinc-300 mb-2 text-center">Series History</h5>
          <p className="text-center text-zinc-100">
            {preview.matchup.team1} {preview.matchup.team1Wins} – {preview.matchup.team2Wins} {preview.matchup.team2}
            {preview.matchup.ties > 0 ? ` (${preview.matchup.ties} ties)` : ""}
          </p>
          {preview.matchup.sinceSeason != null && (
            <p className="text-center text-xs text-zinc-500 mt-1">
              Series since {preview.matchup.sinceSeason} (not all-time)
            </p>
          )}
          {preview.matchup.games?.length > 0 && (
            <ul className="mt-2 text-xs text-zinc-400 space-y-1 max-h-32 overflow-y-auto">
              {[...preview.matchup.games].slice(0, 10).map((g, i) => (
                <li key={i} className="text-center">
                  {g.season}: {g.awayTeam} {g.awayScore ?? "—"} @ {g.homeTeam} {g.homeScore ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {boxScoreDatasets.length > 0 && boxScoreLabels.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300 text-center">Team Stats</h3>
          <BarChart labels={boxScoreLabels} datasets={boxScoreDatasets} />
        </div>
      )}

      {detail?.playerStats?.[0]?.teams?.map((teamGroup, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">{teamGroup.team} Box Score Leaders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {teamGroup.categories?.flatMap((cat) =>
              cat.types?.flatMap((type) =>
                (type.athletes ?? []).slice(0, 1).map((a) => (
                  <div
                    key={`${cat.name}-${type.name}-${a.id}`}
                    className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
                  >
                    <span className="text-zinc-400">{type.name}: </span>
                    <span className="text-zinc-100">{a.name}</span>
                    <span className="text-zinc-500 ml-2">{a.stat}</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      ))}

      {leadersByTeam.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leadersByTeam.map((item, idx) => (
            <div key={idx}>
              <h5 className="text-center text-zinc-100 mb-3">{item.team} Key Players</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.statLeaders?.map((playerStats, i) => (
                  <PlayerCard
                    key={i}
                    player={playerStats.player}
                    stats={playerStats.stats}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {drives.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">Drives</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {drives.map((d) => (
              <div
                key={d.id}
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300"
              >
                <span className="text-zinc-100">{d.offense}</span> vs {d.defense} —{" "}
                {d.yards} yds, {d.plays} plays
                {d.scoring ? " · SCORE" : ""}
              </div>
            ))}
          </div>
          {plays.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPlays((v) => !v)}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              {showPlays ? "Hide" : "Show"} play-by-play ({plays.length})
            </button>
          )}
          {showPlays && (
            <div className="space-y-1 max-h-96 overflow-y-auto mt-2">
              {plays.slice(0, 100).map((p) => (
                <div key={p.id} className="text-xs text-zinc-400 border-b border-zinc-800 py-1">
                  Q{p.period} {p.clock?.minutes}:{String(p.clock?.seconds ?? 0).padStart(2, "0")} —{" "}
                  {p.playText}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
