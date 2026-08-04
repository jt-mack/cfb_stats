import express, { Request, Response } from 'express';
import { NewsRepo } from '../repos/news-repo';
import { LeadersRepo } from '../repos/leaders-repo';
import { RankingsRepo } from '../repos/rankings-repo';
import { DepthChartRepo } from '../repos/depth-chart-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';
import { teamIndex } from '../lib/team-index';

const router = express.Router();
const newsRepo = new NewsRepo();
const leadersRepo = new LeadersRepo();
const rankingsRepo = new RankingsRepo();
const depthChartRepo = new DepthChartRepo();

router.get('/news', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 50);
  await cachedJson(res, `news_${limit}`, 600, () => newsRepo.getNews(limit));
});

router.get('/team/:team_id/news', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const limit = Math.min(Number(req.query.limit ?? 15) || 15, 30);
  const season = parseSeasonQuery(req.query.season);
  const resolvedId = season != null ? await teamIndex.resolveTeamId(teamId, season) : Number(teamId);
  if (!resolvedId) return res.status(404).json({ error: 'Team not found' });
  await cachedJson(res, `team_news_${resolvedId}_${limit}`, 600, () =>
    newsRepo.getTeamNews(resolvedId, limit)
  );
});

router.get('/leaders', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const category = req.query.category != null ? String(req.query.category) : undefined;
  const limit = Math.min(Number(req.query.limit ?? 25) || 25, 50);
  const cacheKey = `leaders_${season}_${category ?? 'default'}_${limit}`;
  await cachedJson(res, cacheKey, 1800, () => leadersRepo.getSeasonLeaders(season, category, limit));
});

router.get('/team/:team_id/leaders', async (req: Request, res: Response) => {
  const teamIdParam = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const teamId = await teamIndex.resolveTeamId(teamIdParam, season);
  if (!teamId) return res.status(404).json({ error: 'Team not found' });
  await cachedJson(res, `team_leaders_${teamId}_${season}`, 1800, () =>
    leadersRepo.getTeamLeaders(teamId, season)
  );
});

router.get('/rankings', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  const cacheKey = `rankings_pollweek_${season ?? 'live'}`;
  await cachedJson(res, cacheKey, 900, () => rankingsRepo.getRankings(season ?? undefined));
});

router.get('/team/:team_id/depthchart', async (req: Request, res: Response) => {
  const teamIdParam = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const teamId = await teamIndex.resolveTeamId(teamIdParam, season);
  if (!teamId) return res.status(404).json({ error: 'Team not found' });
  await cachedJson(res, `depthchart_${teamId}_${season}`, 3600, () =>
    depthChartRepo.getDepthChart(teamId, season)
  );
});

export default router;
