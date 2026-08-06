import type { SeasonContext, SeasonPhase } from "./repos/seasonRepo";
import { getDefaultSeason } from "./seasonHelpers";

/**
 * Features backed by SportsDataverse / ESPN endpoints that do not take a
 * historical season argument (or return current-only data).
 */
export type CurrentSeasonFeature =
  | "news"
  | "teamNews"
  | "depthChart"
  | "roster"
  | "liveScoreboard";

type FeatureRule = {
  /** Must be viewing the active / default CFB season year. */
  requireActiveYear: boolean;
  /** Disable while the active season is still in preseason. */
  disallowPreseason: boolean;
  unavailableMessage: string;
};

const FEATURE_RULES: Record<CurrentSeasonFeature, FeatureRule> = {
  news: {
    requireActiveYear: true,
    disallowPreseason: false,
    unavailableMessage:
      "League news is a live ESPN feed and is only available for the current season.",
  },
  teamNews: {
    requireActiveYear: true,
    disallowPreseason: true,
    unavailableMessage:
      "Team news is only available during the current season once the year is underway.",
  },
  depthChart: {
    requireActiveYear: true,
    disallowPreseason: true,
    unavailableMessage:
      "Depth charts are current-season only and are not published during preseason.",
  },
  roster: {
    requireActiveYear: true,
    disallowPreseason: false,
    unavailableMessage:
      "Roster data from ESPN is current-season only and is not available for historical years.",
  },
  liveScoreboard: {
    requireActiveYear: true,
    disallowPreseason: true,
    unavailableMessage: "Live scores are only available during the current season.",
  },
};

export function getActiveSeasonYear(active: SeasonContext | null): number {
  return active?.defaultSeason ?? active?.year ?? getDefaultSeason();
}

export function isViewingActiveSeason(
  viewingYear: number | null | undefined,
  active: SeasonContext | null
): boolean {
  if (viewingYear == null || Number.isNaN(Number(viewingYear))) return false;
  return Number(viewingYear) === getActiveSeasonYear(active);
}

export function getActiveSeasonPhase(active: SeasonContext | null): SeasonPhase | null {
  return active?.phase ?? null;
}

export type FeatureAvailability = {
  enabled: boolean;
  reason: string | null;
};

export function getFeatureAvailability(
  feature: CurrentSeasonFeature,
  viewingYear: number | null | undefined,
  active: SeasonContext | null
): FeatureAvailability {
  const rule = FEATURE_RULES[feature];

  if (rule.requireActiveYear && !isViewingActiveSeason(viewingYear, active)) {
    return { enabled: false, reason: rule.unavailableMessage };
  }

  if (rule.disallowPreseason && getActiveSeasonPhase(active) === "preseason") {
    // Only apply preseason block when viewing the active year (or active unknown).
    if (isViewingActiveSeason(viewingYear, active) || active == null) {
      return { enabled: false, reason: rule.unavailableMessage };
    }
  }

  return { enabled: true, reason: null };
}

export function isFeatureEnabled(
  feature: CurrentSeasonFeature,
  viewingYear: number | null | undefined,
  active: SeasonContext | null
): boolean {
  return getFeatureAvailability(feature, viewingYear, active).enabled;
}
