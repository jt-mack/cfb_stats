import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRankingsPayload, parsePollRankMap, parsePollWeek } from "./rankings-repo";

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

  it("maps Core ranking ranks that only expose team via $ref", () => {
    const raw = {
      rankings: [
        {
          name: "AP Top 25",
          type: "ap",
          ranks: [
            {
              current: 1,
              team: {
                $ref: "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2025/teams/194",
              },
            },
          ],
        },
      ],
      latestSeason: { year: 2025 },
      latestWeek: { number: 15 },
    };
    const map = parsePollRankMap(raw);
    assert.equal(map.get(194), 1);
    const week = parsePollWeek(raw);
    assert.equal(week.season, 2025);
    assert.equal(week.polls[0]?.ranks[0]?.teamId, 194);
  });
});
