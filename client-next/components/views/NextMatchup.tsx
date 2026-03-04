"use client";

import { useState, useEffect } from "react";
import { ImageCard } from "@/components/cards/ImageCard";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { BarChart } from "@/components/charts/BarChart";
import { WinPercentage } from "@/components/odds/WinPercentage";
import { getGameDetail } from "@/lib/repos";

type NextMatchupProps = {
  id: number;
  name?: string;
  extraData?: {
    odds?: { homeWinProbability?: number; spread?: number };
  };
};

type BoxScoreTeam = {
  team: { displayName?: string; color?: string; alternateColor?: string };
  statistics?: { label?: string; displayValue?: string }[];
};

export function NextMatchup({ id, name, extraData }: NextMatchupProps) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getGameDetail>> | null>(null);
  const [game, setGame] = useState(detail?.game ?? null);
  const [gameInfo, setGameInfo] = useState<{ venue?: { fullName?: string } } | null>(null);
  const [boxScore, setBoxScore] = useState<{ teams: BoxScoreTeam[] } | null>(null);
  const [leaders, setLeaders] = useState<
    { team: { abbreviation?: string; displayName?: string }; statLeaders: { player: { id: string; name: string; displayName: string }; stats: { stat_type: string; stat: string } }[] }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    getGameDetail(id)
      .then((d) => {
        setDetail(d);
        setGame(d.game);
        if (d.game) {
          setGameInfo({
            venue: d.game.venue ? { fullName: d.game.venue } : undefined,
            ...(d.advancedBoxScore as { gameInfo?: { venue?: { fullName?: string } } } | null)?.gameInfo,
          });
        }
        if (d.teamStats && Array.isArray(d.teamStats) && d.teamStats.length > 0) {
          const teams = (d.teamStats[0] as { teams?: BoxScoreTeam[] }).teams;
          if (teams) {
            setBoxScore({
              teams: teams.map((t) => ({
                team: {
                  displayName: (t as { team?: string }).team,
                  color: undefined,
                  alternateColor: undefined,
                },
                statistics: ((t as { stats?: { category?: string; stat?: string }[] }).stats ?? []).map(
                  (s) => ({
                    label: s.category,
                    displayValue: s.stat,
                  })
                ),
              })),
            });
          }
        }
        if (d.playerStats && Array.isArray(d.playerStats) && d.playerStats.length > 0) {
          const teamGroups: typeof leaders = [];
          type TeamType = {
            team?: string;
            categories?: {
              types?: {
                name?: string;
                athletes?: { id: string; name: string; stat: string }[];
              }[];
            }[];
          };
          const ps0 = d.playerStats[0] as { teams?: TeamType[] };
          const teamsList = ps0.teams ?? [];
          teamsList.forEach((t) => {
            const statLeaders: { player: { id: string; name: string; displayName: string }; stats: { stat_type: string; stat: string } }[] = [];
            t.categories?.forEach((cat) => {
              cat.types?.forEach((type) => {
                const first = type.athletes?.[0];
                if (first) {
                  statLeaders.push({
                    player: {
                      id: first.id,
                      name: first.name,
                      displayName: first.name,
                    },
                    stats: {
                      stat_type: type.name ?? "Stat",
                      stat: first.stat,
                    },
                  });
                }
              });
            });
            if (statLeaders.length) {
              teamGroups.push({
                team: {
                  abbreviation: t.team,
                  displayName: t.team,
                },
                statLeaders,
              });
            }
          });
          setLeaders(teamGroups);
        }
      })
      .catch(console.error);
  }, [id]);

  const venueName =
    game?.venue ??
    (gameInfo?.venue?.fullName ?? "Stadium");
  const imgCardProps = {
    title: name ?? (game ? `${game.awayTeam} @ ${game.homeTeam}` : "Game"),
    imgSrc: null,
    imgName: venueName,
    text: venueName,
    sub_text: "",
  };

  const homeWinProb =
    extraData?.odds?.homeWinProbability ??
    (game as { homePostgameWinProbability?: number } | null)?.homePostgameWinProbability ??
    (gameInfo as { homeWinProb?: number } | null)?.homeWinProb;
  const spread = extraData?.odds?.spread;

  const chartLabels = boxScore?.teams?.[0]?.statistics?.map((s) => s.label ?? "") ?? [];
  const chartDatasets =
    boxScore?.teams?.map((t, i) => ({
      label: t.team?.displayName ?? `Team ${i + 1}`,
      data: (t.statistics ?? []).map((s) => parseFloat(s.displayValue ?? "0") || 0),
    })) ?? [];

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {detail && game?.venue && (
          <ImageCard {...imgCardProps} />
        )}
        {detail && game && boxScore?.teams?.length ? (
          <BarChart labels={chartLabels} datasets={chartDatasets} />
        ) : null}
        {game && (homeWinProb != null || spread != null) && (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-100">
            {homeWinProb != null && (
              <WinPercentage
                logoUrl=""
                percentage={(Number(homeWinProb) * 100).toFixed(2)}
                size={200}
                color="#71717a"
              />
            )}
            {spread != null && (
              <h4 className="text-xl font-semibold">
                {spread > 0 ? `+${spread}` : spread}
              </h4>
            )}
          </div>
        )}
      </div>
      {leaders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {leaders.map((item, idx) => (
            <div key={idx}>
              <h5 className="text-center text-zinc-100 mb-3">
                {item.team?.abbreviation ?? item.team?.displayName} Key Players
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.statLeaders?.map((playerStats, i) => (
                  <PlayerCard
                    key={i}
                    player={{
                      ...playerStats.player,
                      fullName: playerStats.player.displayName ?? playerStats.player.name,
                    }}
                    stats={playerStats.stats}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
