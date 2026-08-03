import type { Conference } from "@/lib/types";

const MAIN_CONFERENCE_MAX_ID = 10;

export function filterMainConferences(conferences: Conference[]): Conference[] {
  return conferences.filter(
    (c) => c.classification === "fbs" && c.id < MAIN_CONFERENCE_MAX_ID
  );
}
