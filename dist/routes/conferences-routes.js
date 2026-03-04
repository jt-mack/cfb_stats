"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cache_1 = __importDefault(require("node-cache"));
const conferences_repo_1 = require("../repos/conferences-repo");
const cfbd_client_1 = require("../lib/cfbd-client");
const router = express_1.default.Router();
const cache = new node_cache_1.default({ stdTTL: 3600 });
const conferencesRepo = new conferences_repo_1.ConferencesRepo();
router.get('/conferences', async (req, res) => {
    try {
        const cacheKey = 'conferences';
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const conferences = await conferencesRepo.getConferences();
        cache.set(cacheKey, JSON.stringify(conferences));
        res.json(conferences);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch conferences' });
    }
});
router.get('/conferences/:conference_id/standings', async (req, res) => {
    const conferenceId = Array.isArray(req.params.conference_id) ? req.params.conference_id[0] : req.params.conference_id;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `standings_${conferenceId}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const records = await conferencesRepo.getConferenceRecords(conferenceId, season);
        const rank = (r) => [
            -(r.conferenceGames?.wins ?? 0),
            r.conferenceGames?.losses ?? 0,
            -(r.total?.wins ?? 0),
            r.total?.losses ?? 0,
            (r.team ?? '').toLowerCase(),
        ];
        const sorted = [...records].sort((a, b) => {
            const ra = rank(a), rb = rank(b);
            for (let i = 0; i < ra.length; i++) {
                if (ra[i] < rb[i])
                    return -1;
                if (ra[i] > rb[i])
                    return 1;
            }
            return 0;
        });
        cache.set(cacheKey, JSON.stringify(sorted));
        res.json(sorted);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch standings' });
    }
});
router.get('/teams/conference/:conference_id', async (req, res) => {
    const conferenceId = Array.isArray(req.params.conference_id) ? req.params.conference_id[0] : req.params.conference_id;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `teams_conf_${conferenceId}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const teams = await conferencesRepo.getTeamsByConference(conferenceId, season);
        cache.set(cacheKey, JSON.stringify(teams));
        res.json(teams);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch conference teams' });
    }
});
exports.default = router;
