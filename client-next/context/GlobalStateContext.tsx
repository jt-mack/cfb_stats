"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDefaultSeasonFromApi,
  getSeasonContext,
  type SeasonContext,
} from "@/lib/repos/seasonRepo";
import { getDefaultSeason } from "@/lib/seasonHelpers";

type GlobalState = {
  lastUsedSeason: string | null;
  /** Context for the live / default CFB season (not the year being viewed). */
  activeSeason: SeasonContext | null;
};

type GlobalStateContextValue = {
  globalState: GlobalState;
  setLastUsedSeason: (season: string | null) => void;
  setActiveSeason: (season: SeasonContext | null) => void;
};

const defaultState: GlobalState = {
  lastUsedSeason: null,
  activeSeason: null,
};

const GlobalStateContext = createContext<GlobalStateContextValue | null>(null);

function ActiveSeasonSync({
  onSeason,
}: {
  onSeason: (season: SeasonContext | null) => void;
}) {
  const fallbackYear = getDefaultSeason();
  const { data: defaultSeason } = useQuery({
    queryKey: ["defaultSeason"],
    queryFn: getDefaultSeasonFromApi,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const year = defaultSeason ?? fallbackYear;
  const { data } = useQuery({
    queryKey: ["seasonContext", year],
    queryFn: () => getSeasonContext(year),
    enabled: year != null && !Number.isNaN(year),
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (data) onSeason(data);
  }, [data, onSeason]);

  return null;
}

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [globalState, setGlobalState] = useState<GlobalState>(defaultState);

  useEffect(() => {
    const lastUsedSeason = localStorage.getItem("selected_season");
    if (lastUsedSeason) {
      setGlobalState((prev) => ({ ...prev, lastUsedSeason }));
    }
  }, []);

  const setLastUsedSeason = useCallback((season: string | null) => {
    setGlobalState((prev) => ({ ...prev, lastUsedSeason: season }));
    if (season) localStorage.setItem("selected_season", season);
    else localStorage.removeItem("selected_season");
  }, []);

  const setActiveSeason = useCallback((season: SeasonContext | null) => {
    setGlobalState((prev) => {
      if (prev.activeSeason === season) return prev;
      if (
        prev.activeSeason &&
        season &&
        prev.activeSeason.year === season.year &&
        prev.activeSeason.phase === season.phase &&
        prev.activeSeason.isActive === season.isActive &&
        prev.activeSeason.defaultSeason === season.defaultSeason
      ) {
        return prev;
      }
      return { ...prev, activeSeason: season };
    });
  }, []);

  const value = useMemo(
    () => ({ globalState, setLastUsedSeason, setActiveSeason }),
    [globalState, setLastUsedSeason, setActiveSeason]
  );

  return (
    <GlobalStateContext.Provider value={value}>
      <ActiveSeasonSync onSeason={setActiveSeason} />
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) throw new Error("useGlobalState must be used within GlobalStateProvider");
  return ctx;
}

/** Active (default) season context from global state. */
export function useActiveSeason(): SeasonContext | null {
  return useGlobalState().globalState.activeSeason;
}
