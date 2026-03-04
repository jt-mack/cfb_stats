"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cache_1 = __importDefault(require("node-cache"));
const teams_repo_1 = require("../repos/teams-repo");
const cfbd_client_1 = require("../lib/cfbd-client");
const router = express_1.default.Router();
const cache = new node_cache_1.default({ stdTTL: 3600 });
const teamsRepo = new teams_repo_1.TeamsRepo();
router.get('/team/:team_id/information', async (req, res) => {
    const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `team_info_${teamId}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const team = await teamsRepo.getTeamInfo(teamId, season);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        cache.set(cacheKey, JSON.stringify(team));
        res.json(team);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch team' });
    }
});
router.get('/team/:team_id/players', async (req, res) => {
    const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `roster_${teamId}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        // CFBD roster expects team school name; resolve if team_id is numeric
        let teamName = teamId;
        const idNum = Number(teamId);
        if (!Number.isNaN(idNum)) {
            const team = await teamsRepo.getTeamInfo(teamId, season);
            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }
            teamName = team.school;
        }
        const roster = await teamsRepo.getRoster(teamName, season);
        cache.set(cacheKey, JSON.stringify(roster));
        res.json(roster);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch roster' });
    }
});
router.get('/team/:team_id/coaches', async (req, res) => {
    const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `coaches_${teamId}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        let teamName = teamId;
        const idNum = Number(teamId);
        if (!Number.isNaN(idNum)) {
            const team = await teamsRepo.getTeamInfo(teamId, season);
            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }
            teamName = team.school;
        }
        const coaches = await teamsRepo.getCoaches(teamName, season);
        cache.set(cacheKey, JSON.stringify(coaches));
        res.json(coaches);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch coaches' });
    }
});
exports.default = router;
