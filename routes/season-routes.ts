import express, { Request, Response } from 'express';
import { buildSeasonContext } from '../lib/season-context';
import { cachedJson, parseYearParam } from '../lib/route-helpers';
import { getDefaultSeason } from '../lib/sdv';

const router = express.Router();

router.get('/season/default', (_req: Request, res: Response) => {
  res.json({ defaultSeason: getDefaultSeason() });
});

router.get('/season/:year/context', async (req: Request, res: Response) => {
  const yearParam = Array.isArray(req.params.year) ? req.params.year[0] : req.params.year;
  const year = parseYearParam(String(yearParam));
  if (year == null) return res.status(400).json({ error: 'Invalid year' });

  const ttl = year === getDefaultSeason() ? 900 : 3600;
  await cachedJson(res, `season_context_${year}`, ttl, () => buildSeasonContext(year));
});

export default router;
