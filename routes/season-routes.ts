import express, { Request, Response } from 'express';
import { buildSeasonContext } from '../lib/season-context';
import { ScoreboardRepo } from '../repos/scoreboard-repo';
import { cachedJson, parseWeekParam, parseYearParam } from '../lib/route-helpers';
import { getDefaultSeason } from '../lib/espn-client';

const router = express.Router();
const scoreboardRepo = new ScoreboardRepo();

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

router.get('/scoreboard', async (_req: Request, res: Response) => {
  await cachedJson(res, 'live_scoreboard', 60, () => scoreboardRepo.getLiveScoreboard());
});

router.get('/calendar/:year', async (req: Request, res: Response) => {
  const year = parseYearParam(String(req.params.year));
  if (year == null) return res.status(400).json({ error: 'Invalid year' });

  await cachedJson(res, `calendar_${year}`, 3600, () => scoreboardRepo.getCalendar(year));
});

router.get('/week/:year/:week', async (req: Request, res: Response) => {
  const year = parseYearParam(String(req.params.year));
  const week = parseWeekParam(String(req.params.week));
  if (year == null || week == null) return res.status(400).json({ error: 'Invalid year or week' });

  const seasontypeRaw = req.query.seasontype ?? req.query.seasonType;
  const seasontypeNum = seasontypeRaw != null ? Number(seasontypeRaw) : NaN;
  const seasontype =
    seasontypeNum === 1 || seasontypeNum === 2 || seasontypeNum === 3
      ? seasontypeNum
      : String(seasontypeRaw).toLowerCase() === 'postseason'
        ? 3
        : String(seasontypeRaw).toLowerCase() === 'preseason'
          ? 1
          : 2;

  const cacheKey = `week_games_${year}_${week}_${seasontype}`;
  const ttl = year === getDefaultSeason() ? 900 : 3600;
  await cachedJson(res, cacheKey, ttl, () => scoreboardRepo.getWeekGames(year, week, seasontype));
});

export default router;
