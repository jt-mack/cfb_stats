"use client";

import { useParams } from "next/navigation";

export function useSeasonParams() {
  const params = useParams();
  const year = params?.year as string | undefined;
  const week = params?.week as string | undefined;
  const teamId = params?.team_id as string | undefined;
  const gameId = params?.game_id as string | undefined;
  const confId = params?.conf_id as string | undefined;

  const seasonNum = year ? Number(year) : undefined;
  const weekNum = week ? Number(week) : undefined;
  const gameIdNum = gameId ? Number(gameId) : undefined;

  const isValidSeason = seasonNum != null && !Number.isNaN(seasonNum);
  const isValidWeek = weekNum != null && !Number.isNaN(weekNum);
  const isValidGame = gameIdNum != null && !Number.isNaN(gameIdNum);

  return {
    year,
    week,
    teamId,
    gameId,
    confId,
    seasonNum: isValidSeason ? seasonNum : undefined,
    weekNum: isValidWeek ? weekNum : undefined,
    gameIdNum: isValidGame ? gameIdNum : undefined,
    isValidSeason,
    isValidWeek,
    isValidGame,
  };
}
