import { Venue } from "../lib/types";

export function normalizeVenue(venue: Record<string, unknown>): Venue {
    const images = venue?.images as { href: string, alt?: string, rel?: string[], width?: number, height?: number }[] | undefined ?? [];
    return {
        id: Number(venue?.id) ?? 0,
        name: venue?.name as string ?? '',
        address: {
            city: (venue?.address as { city?: string })?.city ?? '',
            state: (venue?.address as { state?: string })?.state ?? '',
        },
        images: images.map((i) => i.href),
        grass: Boolean(venue?.grass),
        indoor: Boolean(venue?.indoor),
        image: images.find((i) => typeof i === 'object' && 'href' in i && i.href?.includes('interior'))?.href ?? images[0].href as string | undefined,
    };
}