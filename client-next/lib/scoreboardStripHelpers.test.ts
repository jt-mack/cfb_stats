import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scoreboardStripTitle,
  shouldUseLiveScoreboard,
} from "./scoreboardStripHelpers";

describe("shouldUseLiveScoreboard", () => {
  it("uses live only for the default season in regular/postseason", () => {
    assert.equal(shouldUseLiveScoreboard(2026, "regular", 2026), true);
    assert.equal(shouldUseLiveScoreboard(2026, "postseason", 2026), true);
  });

  it("never uses live for a previous season", () => {
    assert.equal(shouldUseLiveScoreboard(2024, "regular", 2026), false);
    assert.equal(shouldUseLiveScoreboard(2024, "postseason", 2026), false);
    assert.equal(shouldUseLiveScoreboard(2024, "offseason", 2026), false);
  });

  it("does not use live in preseason even for the default season", () => {
    assert.equal(shouldUseLiveScoreboard(2026, "preseason", 2026), false);
  });
});

describe("scoreboardStripTitle", () => {
  it("labels the current season as This Week", () => {
    assert.equal(scoreboardStripTitle("regular", 3, true), "This Week");
  });

  it("labels previous seasons with the week number, not This Week", () => {
    assert.equal(scoreboardStripTitle("offseason", 15, false), "Week 15");
    assert.equal(scoreboardStripTitle("postseason", 1, false), "Week 1");
  });

  it("keeps Week 1 Preview for preseason", () => {
    assert.equal(scoreboardStripTitle("preseason", null, true), "Week 1 Preview");
    assert.equal(scoreboardStripTitle("preseason", null, false), "Week 1 Preview");
  });
});
