"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Venue } from "@/lib/types";


export function VenueCard({ venue }: { venue: Venue }) {
    if (!venue?.image && Array.isArray(venue?.images) && venue?.images.length > 0) {
        const firstImage = venue?.images[0];
        if (typeof firstImage === 'string') {
            venue.image = firstImage;
        } else if (typeof firstImage === 'object' && Object.hasOwn(firstImage, 'href')) {
            venue.image = firstImage['href'] as string;
        }

    }
    return (
        <Card className="overflow-hidden bg-zinc-800 border-zinc-700">
            {venue.image ? (
                <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full object-cover h-40"
                />
            ) : (
                <div className="h-40 bg-zinc-700 flex items-center justify-center">
                    <span className="text-zinc-400 text-sm">{venue.name ?? "—"}</span>
                </div>
            )}
            <CardContent className="p-4 text-zinc-100">
                <h3 className="font-semibold text-lg">{venue.name}</h3>
                {venue?.address?.city ? <p className="text-sm text-zinc-300 mt-1">{venue.address.city}</p> : null}
                {venue?.address?.state ? (
                    <p className="text-xs text-zinc-400 mt-1">{venue.address.state}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
