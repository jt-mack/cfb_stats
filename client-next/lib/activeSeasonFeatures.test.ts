import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFeatureAvailability,
  isViewingActiveSeason,
} from "./activeSeasonFeatures";
import type { SeasonContext } from "./repos/seasonRepo";

const activePreseason: SeasonContext = {
  year: 2026,
  defaultSeason: 2026,
  phase: "preseason",
  currentWeek: 1,
  seasonStarted: false,
  firstGameDate: "2026-08-22T07:00Z",
  hasPublishedRankings: true,
  rankingsWeek: 1,
  startDate: "2026-02-01T08:00Z",
  endDate: "2027-01-28T07:59Z",
  isActive: true,
  activeTypeName: "Preseason",
  activeTypeId: 1,
};

const activeRegular: SeasonContext = {
  ...activePreseason,
  phase: "regular",
  seasonStarted: true,
  currentWeek: 3,
  activeTypeName: "Regular Season",
  activeTypeId: 2,
};

describe("activeSeasonFeatures", () => {
  it("treats matching default season as viewing active", () => {
    assert.equal(isViewingActiveSeason(2026, activePreseason), true);
    assert.equal(isViewingActiveSeason(2025, activePreseason), false);
  });

  it("disables news for historical years", () => {
    const avail = getFeatureAvailability("news", 2025, activeRegular);
    assert.equal(avail.enabled, false);
    assert.ok(avail.reason);
  });

  it("allows news for current year even in preseason", () => {
    assert.equal(getFeatureAvailability("news", 2026, activePreseason).enabled, true);
  });

  it("disables depth chart in preseason and for historical years", () => {
    assert.equal(getFeatureAvailability("depthChart", 2026, activePreseason).enabled, false);
    assert.equal(getFeatureAvailability("depthChart", 2025, activeRegular).enabled, false);
    assert.equal(getFeatureAvailability("depthChart", 2026, activeRegular).enabled, true);
  });

  it("disables roster for historical years only", () => {
    assert.equal(getFeatureAvailability("roster", 2025, activeRegular).enabled, false);
    assert.equal(getFeatureAvailability("roster", 2026, activePreseason).enabled, true);
  });
});
