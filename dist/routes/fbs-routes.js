"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cache_1 = __importDefault(require("node-cache"));
const fbs_repo_1 = require("../repos/fbs-repo");
const cfbd_client_1 = require("../lib/cfbd-client");
const router = express_1.default.Router();
const cache = new node_cache_1.default({ stdTTL: 3600 });
const fbsRepo = new fbs_repo_1.FbsRepo();
router.get('/teams', async (req, res) => {
    const season = req.query.season ? Number(req.query.season) : (0, cfbd_client_1.getDefaultSeason)();
    const cacheKey = `fbs_teams_${season}`;
    try {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const teams = await fbsRepo.getFbsTeamsWithRankings(season);
        cache.set(cacheKey, JSON.stringify(teams));
        res.json(teams);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch teams' });
    }
});
exports.default = router;
