import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapScheduleEvent } from "./game-mappers";

describe("mapScheduleEvent extras", () => {
  it("maps logos, poll rank, and broadcast from a schedule event", () => {
    const game = mapScheduleEvent(
      {
        id: "401856686",
        date: "2026-09-19T16:00Z",
        week: { number: 3 },
        competitions: [
          {
            conferenceCompetition: true,
            broadcasts: [{ names: ["ABC"] }],
            competitors: [
              {
                homeAway: "home",
                curatedRank: { current: 99 },
                team: {
                  id: "8",
                  location: "Arkansas",
                  logos: [{ href: "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" }],
                },
              },
              {
                homeAway: "away",
                curatedRank: { current: 2 },
                team: {
                  id: "61",
                  location: "Georgia",
                  logos: [{ href: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png" }],
                },
              },
            ],
            status: { type: { completed: false, state: "pre", description: "Scheduled" } },
          },
        ],
      },
      2026
    );

    assert.equal(game.homeTeam, "Arkansas");
    assert.equal(game.awayRank, 2);
    assert.equal(game.homeRank, null);
    assert.equal(game.broadcast, "ABC");
    assert.match(game.awayLogo ?? "", /61\.png/);
    assert.match(game.homeLogo ?? "", /8\.png/);
  });
});
