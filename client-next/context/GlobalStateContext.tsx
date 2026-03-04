"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getConferences } from "@/lib/repos";
import type { Conference } from "@/lib/types";

type GlobalState = {
  conferences: Conference[];
  lastUsedSeason: string | null;
};

type GlobalStateContextValue = {
  globalState: GlobalState;
  setConferences: (conferences: Conference[]) => void;
  setLastUsedSeason: (season: string | null) => void;
  loadConferences: () => Promise<void>;
};

const defaultState: GlobalState = {
  conferences: [],
  lastUsedSeason: null,
};

const GlobalStateContext = createContext<GlobalStateContextValue | null>(null);

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [globalState, setGlobalState] = useState<GlobalState>(() => {
    if (typeof window === "undefined") return defaultState;
    try {
      const conferences = localStorage.getItem("conferences");
      const lastUsedSeason = localStorage.getItem("selected_season");
      return {
        conferences: conferences ? JSON.parse(conferences) : [],
        lastUsedSeason,
      };
    } catch {
      return defaultState;
    }
  });

  const setConferences = useCallback((conferences: Conference[]) => {
    setGlobalState((prev) => ({ ...prev, conferences }));
    if (typeof window !== "undefined") {
      localStorage.setItem("conferences", JSON.stringify(conferences));
    }
  }, []);

  const setLastUsedSeason = useCallback((season: string | null) => {
    setGlobalState((prev) => ({ ...prev, lastUsedSeason: season }));
    if (typeof window !== "undefined") {
      if (season) localStorage.setItem("selected_season", season);
      else localStorage.removeItem("selected_season");
    }
  }, []);

  const loadConferences = useCallback(async () => {
    if (globalState.conferences.length > 0) return;
    try {
      const conferences = await getConferences();
      setConferences(conferences);
    } catch (e) {
      console.error("Failed to load conferences", e);
    }
  }, [globalState.conferences.length, setConferences]);

  useEffect(() => {
    loadConferences();
  }, [loadConferences]);

  const value: GlobalStateContextValue = {
    globalState,
    setConferences,
    setLastUsedSeason,
    loadConferences,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) throw new Error("useGlobalState must be used within GlobalStateProvider");
  return ctx;
}
