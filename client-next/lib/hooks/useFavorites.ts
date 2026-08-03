"use client";

import { useCallback, useEffect, useState } from "react";

export type FavoriteTeam = { id: number; name: string };

const STORAGE_KEY = "favorites";

function readFavorites(): FavoriteTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteTeam[]) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFavorites(readFavorites());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: FavoriteTeam[]) => {
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const isFavorite = useCallback(
    (id: number) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const getFavorite = useCallback(
    (id: number) => favorites.find((f) => f.id === id) ?? null,
    [favorites]
  );

  const addFavorite = useCallback(
    (entry: FavoriteTeam) => {
      if (favorites.some((f) => f.id === entry.id)) return;
      persist([...favorites, entry]);
    },
    [favorites, persist]
  );

  const removeFavorite = useCallback(
    (id: number) => {
      persist(favorites.filter((f) => f.id !== id));
    },
    [favorites, persist]
  );

  const toggleFavorite = useCallback(
    (entry: FavoriteTeam) => {
      if (favorites.some((f) => f.id === entry.id)) {
        removeFavorite(entry.id);
      } else {
        addFavorite(entry);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  return {
    favorites,
    hydrated,
    isFavorite,
    getFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
}
