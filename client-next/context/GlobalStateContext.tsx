"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

type GlobalState = {
  lastUsedSeason: string | null;
};

type GlobalStateContextValue = {
  globalState: GlobalState;
  setLastUsedSeason: (season: string | null) => void;
};

const defaultState: GlobalState = {
  lastUsedSeason: null,
};

const GlobalStateContext = createContext<GlobalStateContextValue | null>(null);

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

  const value = useMemo(
    () => ({ globalState, setLastUsedSeason }),
    [globalState, setLastUsedSeason]
  );

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

/** @deprecated Use useConferences() from lib/hooks/queries instead */
export function useGlobalConferences() {
  return { conferences: [] as never[] };
}
