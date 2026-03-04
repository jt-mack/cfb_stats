"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SeasonSelect } from "@/components/selects/SeasonSelect";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalState } from "@/context/GlobalStateContext";
import { Menu } from "lucide-react";

function parseYearFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/season\/(\d+)/);
  return match ? match[1] : null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { globalState, setLastUsedSeason } = useGlobalState();
  const [favorites, setFavorites] = useState<{ id: number; name: string }[]>([]);

  const yearFromPath = useMemo(() => parseYearFromPath(pathname ?? ""), [pathname]);
  const currentYear = new Date().getFullYear();
  const season = yearFromPath ?? globalState.lastUsedSeason ?? String(currentYear);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorites");
      if (raw) {
        const parsed = JSON.parse(raw) as { id: number; name: string }[];
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      setFavorites([]);
    }
  }, [pathname]);

  const handleSeasonChange = (newSeason: string) => {
    setLastUsedSeason(newSeason);
    if (pathname?.startsWith("/season/")) {
      const rest = pathname.replace(/^\/season\/\d+/, "");
      const newPath = `/season/${newSeason}${rest}`;
      router.push(newPath);
    } else {
      router.push(`/season/${newSeason}`);
    }
  };

  const seasonForLinks = yearFromPath ?? String(currentYear);

  const navLinks = (
    <>
      <Link
        href={`/season/${seasonForLinks}`}
        className="text-sm text-zinc-400 hover:text-zinc-100 whitespace-nowrap"
      >
        Home
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800">
            Favorites
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="border-zinc-700 bg-zinc-800 text-zinc-100">
          {favorites.length > 0 ? (
            favorites.map(({ name, id }) => (
              <DropdownMenuItem key={id} asChild>
                <Link href={`/season/${seasonForLinks}/team/${id}`}>{name}</Link>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No Favorites Yet</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
        <Link
          href={`/season/${seasonForLinks}`}
          className="text-base sm:text-lg font-semibold text-zinc-100 truncate min-w-0"
        >
          <span className="hidden sm:inline">College Football Stats</span>
          <span className="sm:hidden">CFB Stats</span>
        </Link>
        {/* Desktop: nav links + season select */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
          {navLinks}
          <SeasonSelect value={season} onValueChange={handleSeasonChange} />
        </div>
        {/* Mobile: hamburger menu with nav + season */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="border-zinc-700 bg-zinc-800 text-zinc-100 w-[min(100vw-2rem,320px)] p-3 space-y-3"
          >
            <div className="flex flex-col gap-1">
              <Link
                href={`/season/${seasonForLinks}`}
                className="px-2 py-2 rounded-md text-sm text-zinc-100 hover:bg-zinc-700"
                onClick={() => document.dispatchEvent(new Event("close-mobile-nav"))}
              >
                Home
              </Link>
              <div className="text-xs font-medium text-zinc-500 px-2 pt-1">Favorites</div>
              {favorites.length > 0 ? (
                favorites.map(({ name, id }) => (
                  <Link
                    key={id}
                    href={`/season/${seasonForLinks}/team/${id}`}
                    className="px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                    onClick={() => document.dispatchEvent(new Event("close-mobile-nav"))}
                  >
                    {name}
                  </Link>
                ))
              ) : (
                <span className="px-2 py-2 text-sm text-zinc-500">No favorites yet</span>
              )}
            </div>
            <div className="border-t border-zinc-700 pt-3">
              <label className="text-xs font-medium text-zinc-500 block mb-2">Season</label>
              <SeasonSelect value={season} onValueChange={handleSeasonChange} />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
