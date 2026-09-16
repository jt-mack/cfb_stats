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
  getCalendar,
  getTeamRatings,
  getTeamRecruiting,
  getGameDrives,
  getGamePlays,
} from "@/lib/repos/extrasRepo";
import { getGamePreview } from "@/lib/repos/gamesRepo";
import { shouldUseLiveScoreboard } from "@/lib/scoreboardStripHelpers";
import { getFbsStandings } from "@/lib/repos/conferencesRepo";
import {
  getNews,
  getTeamNews,
  getLeaders,
  getTeamLeaders,
  getRankings,
} from "@/lib/repos/contentRepo";
import { getAthlete, getAthleteStats } from "@/lib/repos/athletesRepo";

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

export function useFbsStandings(season: number | undefined) {
  return useQuery({
    queryKey: ["fbsStandings", season],
    queryFn: () => getFbsStandings(season),
    enabled: season != null && !Number.isNaN(season),
  });
}

export function useCalendar(year: number | undefined) {
  return useQuery({
    queryKey: ["calendar", year],
    queryFn: () => getCalendar(year!),
    enabled: year != null && !Number.isNaN(year),
    staleTime: 60 * 60 * 1000,
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

export function useRoster(teamId: string | undefined, season: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["roster", teamId, season],
    queryFn: () => getRoster(teamId!, season),
    enabled: enabled && Boolean(teamId) && season != null && !Number.isNaN(season),
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

export function useWeekGames(
  year: number | undefined,
  week: number | undefined,
  enabled = true,
  seasontype: number | string = 2
) {
  return useQuery({
    queryKey: ["weekGames", year, week, seasontype],
    queryFn: () => getWeekGames(year!, week!, seasontype),
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
  enabled = true,
  defaultSeason?: number,
  isActive?: boolean | null
) {
  const isLive = shouldUseLiveScoreboard(year, phase, defaultSeason, isActive);
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

export function useGameDrives(gameId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["gameDrives", gameId],
    queryFn: () => getGameDrives(gameId!),
    enabled: enabled && gameId != null && !Number.isNaN(gameId),
  });
}

export function useGamePlays(gameId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["gamePlays", gameId],
    queryFn: () => getGamePlays(gameId!),
    enabled: enabled && gameId != null && !Number.isNaN(gameId),
  });
}

export function useNews(limit = 25, enabled = true) {
  return useQuery({
    queryKey: ["news", limit],
    queryFn: () => getNews(limit),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamNews(
  teamId: string | undefined,
  season: number | undefined,
  limit = 15,
  enabled = true
) {
  return useQuery({
    queryKey: ["teamNews", teamId, season, limit],
    queryFn: () => getTeamNews(teamId!, season, limit),
    enabled: enabled && Boolean(teamId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaders(season: number | undefined, category?: string, limit = 25) {
  return useQuery({
    queryKey: ["leaders", season, category, limit],
    queryFn: () => getLeaders(season!, category, limit),
    enabled: season != null && !Number.isNaN(season),
    staleTime: 15 * 60 * 1000,
  });
}

export function useTeamLeaders(teamId: string | undefined, season: number | undefined) {
  return useQuery({
    queryKey: ["teamLeaders", teamId, season],
    queryFn: () => getTeamLeaders(teamId!, season!),
    enabled: Boolean(teamId) && season != null && !Number.isNaN(season),
  });
}

export function useRankings(season: number | undefined) {
  return useQuery({
    queryKey: ["rankings", season],
    queryFn: () => getRankings(season),
    enabled: season != null && !Number.isNaN(season),
    staleTime: 15 * 60 * 1000,
  });
}

export function useAthlete(athleteId: string | undefined) {
  return useQuery({
    queryKey: ["athlete", athleteId],
    queryFn: () => getAthlete(athleteId!),
    enabled: Boolean(athleteId),
  });
}

export function useAthleteStats(athleteId: string | undefined) {
  return useQuery({
    queryKey: ["athleteStats", athleteId],
    queryFn: () => getAthleteStats(athleteId!),
    enabled: Boolean(athleteId),
  });
}
