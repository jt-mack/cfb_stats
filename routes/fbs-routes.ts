import express, { Request, Response } from 'express';
import { FbsRepo } from '../repos/fbs-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';
import { getDefaultSeason } from '../lib/sdv';

const router = express.Router();
const fbsRepo = new FbsRepo();

router.get('/teams', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `fbs_teams_${season}`;
  const ttl = season === getDefaultSeason() ? 900 : 3600;

  await cachedJson(res, cacheKey, ttl, () => fbsRepo.getFbsTeamsWithRankings(season));
});

export default router;
