import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractStandingsEntries,
  mapStandingsEntryToRecord,
} from "./conferences-repo";
import type { SdvStandingsEntry, SdvStandingsResponse } from "../lib/espn-types";

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
