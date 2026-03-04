"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConferencesRepo = void 0;
const cfbd_1 = require("cfbd");
const cfbd_client_1 = require("../lib/cfbd-client");
class ConferencesRepo {
    /**
     * Get all conferences (CFBD returns FBS conferences).
     */
    async getConferences() {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getConferences)({}));
    }
    /**
     * Get teams in a conference for a given year.
     * conferenceAbbr: e.g. "SEC", "B1G"
     */
    async getTeamsByConference(conferenceAbbr, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getTeams)({ query: { conference: conferenceAbbr, year } }));
    }
    /**
     * Get conference standings/records for a conference and year.
     */
    async getConferenceRecords(conferenceAbbr, year) {
        return (0, cfbd_client_1.unwrap)((0, cfbd_1.getRecords)({ query: { conference: conferenceAbbr, year } }));
    }
}
exports.ConferencesRepo = ConferencesRepo;
