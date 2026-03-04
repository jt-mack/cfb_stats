"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cache_1 = __importDefault(require("node-cache"));
const games_repo_1 = require("../repos/games-repo");
const cfbd_client_1 = require("../lib/cfbd-client");
const router = express_1.default.Router();
const cache = new node_cache_1.default({ stdTTL: 1800 });
const gamesRepo = new games_repo_1.GamesRepo();
router.get('/schedule/:team_name', async (req, res) => {
    const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `schedule_${teamName}_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const schedule = await gamesRepo.getScheduleWithOdds(teamName, season);
        cache.set(cacheKey, JSON.stringify(schedule));
        res.json(schedule);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch schedule' });
    }
});
router.get('/games/:game_id', async (req, res) => {
    const gameId = Number(req.params.game_id);
    if (Number.isNaN(gameId)) {
        return res.status(400).json({ error: 'Invalid game id' });
    }
    const cacheKey = `game_detail_${gameId}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const detail = await gamesRepo.getGameDetail(gameId);
        if (!detail.game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        cache.set(cacheKey, JSON.stringify(detail));
        res.json(detail);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch game' });
    }
});
exports.default = router;
