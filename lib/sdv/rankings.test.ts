import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRankingsPayload, parsePollRankMap } from "./rankings";

describe("normalizeRankingsPayload", () => {
  it("keeps site.api rankings at the top level", () => {
    const raw = { rankings: [{ name: "AP Top 25", type: "ap", ranks: [] }] };
    assert.equal(normalizeRankingsPayload(raw).rankings, raw.rankings);
  });

  it("lifts CDN content.rankings to top level", () => {
    const ranks = [{ team: { id: "99" }, current: 1 }];
    const raw = { content: { rankings: [{ name: "AP Top 25", type: "ap", ranks }] } };
    const normalized = normalizeRankingsPayload(raw);
    assert.ok(Array.isArray(normalized.rankings));
    assert.equal((normalized.rankings as unknown[]).length, 1);
  });
});

describe("parsePollRankMap", () => {
  it("prefers AP poll ranks from a year-specific payload", () => {
    const raw = {
      content: {
        rankings: [
          {
            name: "Coaches Poll",
            type: "coaches",
            ranks: [{ team: { id: "2" }, current: 1 }],
          },
          {
            name: "AP Top 25",
            type: "ap",
            ranks: [
              { team: { id: "333" }, current: 1 },
              { team: { id: "251" }, current: 2 },
            ],
          },
        ],
      },
    };
    const map = parsePollRankMap(raw);
    assert.equal(map.get(333), 1);
    assert.equal(map.get(251), 2);
    assert.equal(map.has(2), false);
  });
});
