"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Venue } from "@/lib/types";

export function VenueCard({ venue }: { venue: Venue }) {
  let image = venue.image;
  if (!image && Array.isArray(venue.images) && venue.images.length > 0) {
    const firstImage = venue.images[0];
    if (typeof firstImage === "string") {
      image = firstImage;
    } else if (typeof firstImage === "object" && Object.hasOwn(firstImage, "href")) {
      image = firstImage["href"] as string;
    }
  }

  return (
    <Card className="overflow-hidden gap-0 py-0">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={venue.name} className="w-full object-cover h-40" />
      ) : (
        <div className="h-40 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">{venue.name ?? "—"}</span>
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg">{venue.name}</h3>
        {venue?.address?.city ? (
          <p className="text-sm text-foreground/80 mt-1">{venue.address.city}</p>
        ) : null}
        {venue?.address?.state ? (
          <p className="text-xs text-muted-foreground mt-1">{venue.address.state}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
