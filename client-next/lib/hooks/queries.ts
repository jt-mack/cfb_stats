"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTeams,
  getConferences,
  getStandings,
  getTeamsByConference,
  getTeamInfo,
  getRoster,
  getCoaches,
  getSchedule,
  getSeasonContext,
  getDefaultSeasonFromApi,
} from "@/lib/repos";
import {
  getScheduleEnrichment,
  getLiveScoreboard,
  getWeekGames,
  getTeamRatings,
  getTeamRecruiting,
  getGameDrives,
  getGamePlays,
} from "@/lib/repos/extrasRepo";
import { getGamePreview } from "@/lib/repos/gamesRepo";

export function useDefaultSeason() {
  return useQuery({
    queryKey: ["defaultSeason"],
    queryFn: getDefaultSeasonFromApi,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useSeasonContext(year: number | undefined) {
  return useQuery({
    queryKey: ["seasonContext", year],
    queryFn: () => getSeasonContext(year!),
    enabled: year != null && !Number.isNaN(year),
  });
}

export function useConferences() {
  return useQuery({
    queryKey: ["conferences"],
    queryFn: getConferences,
    staleTime: 60 * 60 * 1000,
  });
}

export function useTeams(season: number | undefined) {
  return useQuery({
    queryKey: ["teams", season],
    queryFn: () => getTeams(season!),
    enabled: season != null && !Number.isNaN(season),
  });
}

export function useStandings(confId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["standings", confId, season],
    queryFn: () => getStandings(confId!, season),
    enabled: Boolean(confId) && season != null && !Number.isNaN(season),
  });
}

export function useConferenceTeams(confId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["conferenceTeams", confId, season],
    queryFn: () => getTeamsByConference(confId!, season),
    enabled: Boolean(confId) && season != null && !Number.isNaN(season),
  });
}

export function useTeamInfo(teamId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["teamInfo", teamId, season],
    queryFn: () => getTeamInfo(teamId!, season),
    enabled: Boolean(teamId) && season != null && !Number.isNaN(season),
  });
}

export function useRoster(teamId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["roster", teamId, season],
    queryFn: () => getRoster(teamId!, season),
    enabled: Boolean(teamId) && season != null && !Number.isNaN(season),
  });
}

export function useCoaches(teamId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["coaches", teamId, season],
    queryFn: () => getCoaches(teamId!, season),
    enabled: Boolean(teamId) && season != null && !Number.isNaN(season),
  });
}

export function useSchedule(teamName: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["schedule", teamName, season],
    queryFn: () => getSchedule(teamName!, season),
    enabled: Boolean(teamName) && season != null && !Number.isNaN(season),
  });
}

export function useScheduleEnrichment(teamName: string | undefined, season: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["scheduleEnrichment", teamName, season],
    queryFn: () => getScheduleEnrichment(teamName!, season),
    enabled: enabled && Boolean(teamName) && season != null && !Number.isNaN(season),
  });
}

export function useTeamRatings(season: number | undefined, teamName: string | undefined) {
  return useQuery({
    queryKey: ["teamRatings", season, teamName],
    queryFn: () => getTeamRatings(season!, teamName!),
    enabled: Boolean(teamName) && season != null && !Number.isNaN(season),
  });
}

export function useTeamRecruiting(teamName: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["teamRecruiting", teamName, season],
    queryFn: () => getTeamRecruiting(teamName!, season),
    enabled: Boolean(teamName) && season != null && !Number.isNaN(season),
  });
}

export function useWeekGames(year: number | undefined, week: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["weekGames", year, week],
    queryFn: () => getWeekGames(year!, week!),
    enabled: enabled && year != null && week != null && !Number.isNaN(year) && !Number.isNaN(week),
  });
}

export function useLiveScoreboard(enabled = true) {
  return useQuery({
    queryKey: ["liveScoreboard"],
    queryFn: getLiveScoreboard,
    enabled,
    staleTime: 30_000,
  });
}

export function useScoreboardStripGames(
  year: number | undefined,
  phase: string | null | undefined,
  currentWeek: number | null | undefined,
  enabled = true
) {
  const isLive = phase === "regular" || phase === "postseason";
  const live = useLiveScoreboard(enabled && isLive);
  const week = useWeekGames(
    year,
    currentWeek ?? 1,
    enabled && !isLive && phase != null
  );
  return isLive ? live : week;
}

export function useGamePreview(gameId: number | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["gamePreview", gameId, season],
    queryFn: () => getGamePreview(gameId!, season),
    enabled: gameId != null && !Number.isNaN(gameId) && season != null && !Number.isNaN(season),
  });
}

export function useGameDrives(gameId: number | undefined, season: number | undefined, week: number | undefined) {
  return useQuery({
    queryKey: ["gameDrives", gameId, season, week],
    queryFn: () => getGameDrives(gameId!, season!, week!),
    enabled: gameId != null && season != null && week != null,
  });
}

export function useGamePlays(gameId: number | undefined, season: number | undefined, week: number | undefined) {
  return useQuery({
    queryKey: ["gamePlays", gameId, season, week],
    queryFn: () => getGamePlays(gameId!, season!, week!),
    enabled: gameId != null && season != null && week != null,
  });
}
