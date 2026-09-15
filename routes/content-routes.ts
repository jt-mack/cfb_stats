import express, { Request, Response } from 'express';
import { NewsRepo } from '../repos/news-repo';
import { LeadersRepo } from '../repos/leaders-repo';
import { RankingsRepo } from '../repos/rankings-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';

const router = express.Router();
const newsRepo = new NewsRepo();
const leadersRepo = new LeadersRepo();
const rankingsRepo = new RankingsRepo();

router.get('/news', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 50);
  await cachedJson(res, `news_${limit}`, 600, () => newsRepo.getNews(limit));
});

router.get('/leaders', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const category = req.query.category != null ? String(req.query.category) : undefined;
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 50);
  const cacheKey = `leaders_${season}_${category ?? 'default'}_${limit}`;
  await cachedJson(res, cacheKey, 1800, () => leadersRepo.getSeasonLeaders(season, category, limit));
});

router.get('/rankings', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  const cacheKey = `rankings_pollweek_${season ?? 'live'}`;
  await cachedJson(res, cacheKey, 900, () => rankingsRepo.getRankings(season ?? undefined));
});

export default router;
