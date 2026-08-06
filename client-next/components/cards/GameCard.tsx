"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Game } from "@/lib/types";
import Link from "next/link";

import { formatSeasonDate } from "@/lib/seasonHelpers";


export function GameCard({ game, year }: { game: Game, year: number }) {
    const venue = game.venue;
    return (
        <Card className="overflow-hidden bg-zinc-800 border-zinc-700">
            {venue?.image ? (
                <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full object-cover h-60"
                />
            ) : (
                <div className="h-40 bg-zinc-700 flex items-center justify-center">
                    <span className="text-zinc-400 text-sm">{venue?.name ?? "—"}</span>
                </div>
            )}
            <CardContent className="p-4 text-zinc-100">
                <div className="text-center">
                    <Link href={`/season/${year}`} className="text-sm text-zinc-500 hover:text-zinc-300">
                        ← Back to season
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-2">
                        Week {game.week}: {game.awayTeam} @ {game.homeTeam}
                    </h1>
                    {game.startDate && (
                        <p className="text-sm text-zinc-500">{formatSeasonDate(game.startDate)}</p>
                    )}

                    <h3 className="font-semibold text-lg">{venue?.name}</h3>
                    {venue?.address?.city && venue?.address?.state ? <p className="text-sm text-zinc-300 mt-1">{venue.address.city}, {venue.address.state}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}
