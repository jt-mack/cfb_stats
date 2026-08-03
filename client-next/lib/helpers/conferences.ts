import type { Conference } from "@/lib/types";

/** Power conferences for season homepage quick-links only (ACC, Big 12, Big Ten, SEC, Pac-12). */
const POWER_CONFERENCE_IDS = new Set([1, 4, 5, 8, 9]);

export function filterMainConferences(conferences: Conference[]): Conference[] {
  return conferences.filter(
    (c) => c.classification === "fbs" && POWER_CONFERENCE_IDS.has(c.id)
  );
}
