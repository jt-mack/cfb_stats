"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGlobalState, useActiveSeason } from "@/context/GlobalStateContext";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { SeasonSelect } from "@/components/selects/SeasonSelect";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { getDefaultSeason } from "@/lib/seasonHelpers";
import { isFeatureEnabled } from "@/lib/activeSeasonFeatures";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function parseYearFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/season\/(\d+)/);
  return match ? match[1] : null;
}

const PRIMARY_LINKS = [
  { label: "Home", href: (y: string) => `/season/${y}`, feature: null },
  { label: "Scores", href: (y: string) => `/season/${y}/scores`, feature: null },
  { label: "Standings", href: (y: string) => `/season/${y}/standings`, feature: null },
  { label: "Rankings", href: (y: string) => `/season/${y}/rankings`, feature: null },
  { label: "Statistics", href: (y: string) => `/season/${y}/stats`, feature: null },
  { label: "News", href: (y: string) => `/season/${y}/news`, feature: "news" as const },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { globalState, setLastUsedSeason } = useGlobalState();
  const activeSeason = useActiveSeason();
  const { favorites, hydrated } = useFavorites();
  const [mobileOpen, setMobileOpen] = useState(false);

  const yearFromPath = useMemo(() => parseYearFromPath(pathname ?? ""), [pathname]);
  const defaultSeason = getDefaultSeason();
  const season = yearFromPath ?? globalState.lastUsedSeason ?? String(defaultSeason);
  const seasonForLinks = yearFromPath ?? String(defaultSeason);
  const seasonNum = Number(seasonForLinks);

  const visibleLinks = PRIMARY_LINKS.filter((link) => {
    if (!link.feature) return true;
    return isFeatureEnabled(link.feature, seasonNum, activeSeason);
  });

  const handleSeasonChange = (newSeason: string) => {
    setLastUsedSeason(newSeason);
    if (pathname?.startsWith("/season/")) {
      const rest = pathname.replace(/^\/season\/\d+/, "");
      router.push(`/season/${newSeason}${rest}`);
    } else {
      router.push(`/season/${newSeason}`);
    }
  };

  const navLinks = (
    <>
      {visibleLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href(seasonForLinks)}
          className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          {link.label}
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Favorites
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {hydrated && favorites.length > 0 ? (
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
    <nav className="border-b border-border bg-card text-card-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
        <Link
          href={`/season/${seasonForLinks}`}
          className="text-base sm:text-lg font-semibold text-foreground truncate min-w-0"
        >
          <span className="hidden sm:inline">College Football Stats</span>
          <span className="sm:hidden">CFB Stats</span>
        </Link>
        <div className="hidden lg:flex items-center gap-3 xl:gap-5 shrink-0">
          {navLinks}
          <SeasonSelect value={season} onValueChange={handleSeasonChange} />
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(100vw-2rem,320px)]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4 pb-4">
              {visibleLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href(seasonForLinks)}
                  onClick={() => setMobileOpen(false)}
                  className="px-2 py-2 rounded-md text-sm text-foreground hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="text-xs font-medium text-muted-foreground px-2 pt-2">
                Favorites
              </div>
              {hydrated && favorites.length > 0 ? (
                favorites.map(({ name, id }) => (
                  <Link
                    key={id}
                    href={`/season/${seasonForLinks}/team/${id}`}
                    onClick={() => setMobileOpen(false)}
                    className="px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {name}
                  </Link>
                ))
              ) : (
                <span className="px-2 py-2 text-sm text-muted-foreground">
                  No favorites yet
                </span>
              )}
              <Separator className="my-3" />
              <label className="text-xs font-medium text-muted-foreground block mb-2 px-2">
                Season
              </label>
              <SeasonSelect value={season} onValueChange={handleSeasonChange} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
