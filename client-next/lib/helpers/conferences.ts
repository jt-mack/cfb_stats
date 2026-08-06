import type { Conference } from "@/lib/types";

/** Power conferences for season homepage quick-links (ACC, Big 12, Big Ten, SEC). */
const POWER_CONFERENCE_IDS = new Set([1, 4, 5, 8]);

export function filterMainConferences(conferences: Conference[]): Conference[] {
  return conferences.filter(
    (c) => c.classification === "fbs" && POWER_CONFERENCE_IDS.has(c.id)
  );
}
