import express, { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { FbsRepo } from '../repos/fbs-repo';
import { getDefaultSeason } from '../lib/cfbd-client';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });
const fbsRepo = new FbsRepo();

router.get('/teams', async (req: Request, res: Response) => {
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `fbs_teams_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const teams = await fbsRepo.getFbsTeamsWithRankings(season);
    cache.set(cacheKey, JSON.stringify(teams));
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch teams' });
  }
});

export default router;
