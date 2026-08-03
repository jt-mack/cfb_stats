import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractStandingsEntries,
  mapParsedStandingsToRecord,
  mapStandingsEntryToRecord,
} from "./mappers";
import type { SdvStandingsEntry, SdvStandingsResponse } from "./types";

describe("mapStandingsEntryToRecord", () => {
  it("maps overall and conference records from displayValue", () => {
    const entry: SdvStandingsEntry = {
      team: { id: "61", location: "Georgia", displayName: "Georgia Bulldogs" },
      stats: [
        { type: "wins", name: "wins", displayValue: "11" },
        { type: "total", name: "overall", displayValue: "11-3" },
        { type: "vsconf", name: "vs. Conf.", displayValue: "6-2" },
      ],
    };

    const rec = mapStandingsEntryToRecord(entry, 2024, "SEC");
    assert.equal(rec.total.wins, 11);
    assert.equal(rec.total.losses, 3);
    assert.equal(rec.conferenceGames.wins, 6);
    assert.equal(rec.conferenceGames.losses, 2);
  });
});

describe("mapParsedStandingsToRecord", () => {
  it("does not invent overall from bare wins when W-L strings are missing", () => {
    const rec = mapParsedStandingsToRecord(
      { team_id: 61, team_location: "Georgia", wins: 4 },
      2024,
      "SEC"
    );
    assert.equal(rec.total.wins, 0);
    assert.equal(rec.total.losses, 0);
    assert.equal(rec.conferenceGames.wins, 0);
  });

  it("uses string overall and vs_conf when present", () => {
    const rec = mapParsedStandingsToRecord(
      { team_id: 61, team_location: "Georgia", overall: "11-3", vs_conf: "6-2" },
      2024,
      "SEC"
    );
    assert.equal(rec.total.wins, 11);
    assert.equal(rec.total.losses, 3);
    assert.equal(rec.conferenceGames.wins, 6);
    assert.equal(rec.conferenceGames.losses, 2);
  });
});

describe("extractStandingsEntries", () => {
  it("flattens nested conference children", () => {
    const raw: SdvStandingsResponse = {
      children: [
        {
          name: "SEC",
          standings: {
            entries: [
              {
                team: { id: "61", location: "Georgia" },
                stats: [{ type: "total", name: "overall", displayValue: "11-3" }],
              },
            ],
          },
        },
      ],
    };
    const entries = extractStandingsEntries(raw);
    assert.equal(entries.length, 1);
    assert.equal(String(entries[0].team?.id), "61");
  });
});
