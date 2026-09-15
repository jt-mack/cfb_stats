import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SdvEspnTeam, SdvRecordItem } from "./espn-types";
import {
  conferenceGroupIdFromTeam,
  mapEspnTeamToTeam,
  mapRanksToRank,
  mapRecordItems,
  synthesizeStandingSummary,
} from "./team-index";

const georgiaHubRecordItems: SdvRecordItem[] = [
  {
    description: "Overall Record",
    type: "total",
    summary: "2-0",
    stats: [
      { name: "avgPointsAgainst", value: 11.5 },
      { name: "avgPointsFor", value: 66.5 },
      { name: "gamesPlayed", value: 2 },
      { name: "losses", value: 0 },
      { name: "pointsAgainst", value: 23 },
      { name: "pointsFor", value: 133 },
      { name: "streak", value: 2 },
      { name: "ties", value: 0 },
      { name: "winPercent", value: 1 },
      { name: "wins", value: 2 },
    ],
  },
];

describe("mapRecordItems", () => {
  it("maps hub overall record stats", () => {
    const mapped = mapRecordItems(georgiaHubRecordItems);
    assert.equal(mapped.recordSummary, "2-0");
    assert.equal(mapped.recordStats?.wins, 2);
    assert.equal(mapped.recordStats?.losses, 0);
    assert.equal(mapped.recordStats?.pointsFor, 133);
    assert.equal(mapped.recordStats?.pointsAgainst, 23);
    assert.equal(mapped.recordStats?.avgPointsFor, 66.5);
    assert.equal(mapped.recordStats?.streak, 2);
  });

  it("captures vsconf summary when present", () => {
    const mapped = mapRecordItems([
      ...georgiaHubRecordItems,
      { type: "vsconf", summary: "1-0" },
    ]);
    assert.equal(mapped.recordStats?.conferenceSummary, "1-0");
  });
});

describe("mapEspnTeamToTeam", () => {
  it("reads standingSummary, rank, and inline record from the site hub", () => {
    const espn: SdvEspnTeam = {
      id: "61",
      location: "Georgia",
      name: "Bulldogs",
      abbreviation: "UGA",
      color: "ba0c2f",
      rank: 2,
      standingSummary: "2nd in SEC",
      groups: { id: "8" },
      record: { items: georgiaHubRecordItems },
    };
    const team = mapEspnTeamToTeam(espn);
    assert.equal(team.school, "Georgia");
    assert.equal(team.rank, 2);
    assert.equal(team.standingSummary, "2nd in SEC");
    assert.equal(team.recordSummary, "2-0");
    assert.equal(team.conferenceGroupId, "8");
    assert.equal(team.conference, "SEC");
    assert.equal(team.recordStats?.pointsFor, 133);
  });

  it("extracts conference group id from a Core $ref", () => {
    const espn: SdvEspnTeam = {
      id: "61",
      location: "Georgia",
      groups: {
        $ref: "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2025/types/3/groups/8?lang=en&region=us",
      },
    };
    assert.equal(conferenceGroupIdFromTeam(espn), "8");
    const team = mapEspnTeamToTeam(espn);
    assert.equal(team.conferenceGroupId, "8");
    assert.equal(team.conference, "SEC");
  });
});

describe("mapRanksToRank", () => {
  it("reads current from a rank item", () => {
    assert.equal(mapRanksToRank({ items: [{ current: 2 }] }), 2);
  });

  it("ignores empty or unranked payloads", () => {
    assert.equal(mapRanksToRank({ items: [{ $ref: "http://example" }] }), null);
    assert.equal(mapRanksToRank(null), null);
  });
});

describe("synthesizeStandingSummary", () => {
  it("combines rank and conference when the hub phrase is missing", () => {
    assert.equal(synthesizeStandingSummary(2, "SEC"), "#2 · SEC");
    assert.equal(synthesizeStandingSummary(null, "SEC"), "SEC");
  });
});
