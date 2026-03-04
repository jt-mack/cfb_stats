"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsRepo = void 0;
const cfbd_1 = require("cfbd");
const cfbd_client_1 = require("../lib/cfbd-client");
class TeamsRepo {
    /**
     * Get a single team by id (number) or school name.
     * Fetches FBS teams for the year and returns the match.
     */
    async getTeamInfo(teamIdOrSchool, year) {
        const teams = await (0, cfbd_client_1.unwrap)((0, cfbd_1.getFbsTeams)({ query: { year } }));
        const idNum = Number(teamIdOrSchool);
        if (!Number.isNaN(idNum)) {
            return teams.find((t) => t.id === idNum) ?? null;
        }
        return teams.find((t) => t.school === teamIdOrSchool) ?? null;
    }
    /**
     * Get roster for a team (by school name) and year.
     */
    async getRoster(team, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getRoster)({ query: { team, year } }));
    }
    /**
     * Get coaches for a team and year.
     */
    async getCoaches(team, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getCoaches)({ query: { team, year } }));
    }
}
exports.TeamsRepo = TeamsRepo;
