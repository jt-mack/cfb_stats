import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePowerIndexCollection } from "./espn";
import { teamIdFromRef } from "../repos/ratings-repo";

describe("parsePowerIndexCollection", () => {
  it("flattens ESPN collection items including teams outside the default page of 25", () => {
    const rows = parsePowerIndexCollection({
      items: [
        {
          team: {
            $ref: "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/teams/61?lang=en&region=us",
          },
          season: 2026,
          predictives: [{ name: "fpi", value: 26 }],
          efficiencies: [{ name: "offefficiency", value: 90 }],
        },
        {
          team: {
            $ref: "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/teams/8?lang=en&region=us",
          },
          season: 2026,
          predictives: [{ name: "fpi", value: -1.7 }],
          efficiencies: [{ name: "offefficiency", value: 40 }],
        },
      ],
    });

    assert.equal(rows.length, 2);
    assert.equal(teamIdFromRef(String(rows[0].team_$ref)), 61);
    assert.equal(teamIdFromRef(String(rows[1].team_$ref)), 8);
    assert.equal(JSON.parse(rows[1].efficiencies ?? "[]")[0].value, 40);
  });
});
