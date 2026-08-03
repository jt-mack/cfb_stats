import express, { Request, Response } from 'express';
import { GamesRepo } from '../repos/games-repo';
import { MatchupPreviewRepo } from '../repos/matchup-preview-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';
import { routeCache } from '../lib/cache';
import { getDefaultSeason } from '../lib/sdv';

const router = express.Router();
const gamesRepo = new GamesRepo();
const previewRepo = new MatchupPreviewRepo();

router.get('/schedule/:team_name', async (req: Request, res: Response) => {
  const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `schedule_${teamName}_${season}`;
  const ttl = season === getDefaultSeason() ? 900 : 1800;
  await cachedJson(res, cacheKey, ttl, () => gamesRepo.getScheduleWithOdds(teamName, season));
});

router.get('/games/:game_id', async (req: Request, res: Response) => {
  const gameId = Number(req.params.game_id);
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  const cacheKey = `game_detail_${gameId}`;
  const cached = routeCache.get<unknown>(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const detail = await gamesRepo.getGameDetail(gameId);
    if (!detail.game) return res.status(404).json({ error: 'Game not found' });
    const ttl = detail.game.completed ? 86400 : 900;
    routeCache.set(cacheKey, detail, ttl);
    res.json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch game' });
  }
});

router.get('/preview/:game_id', async (req: Request, res: Response) => {
  const gameId = Number(req.params.game_id);
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `game_preview_${gameId}_${season}`;
  const cached = routeCache.get<unknown>(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const preview = await previewRepo.getGamePreview(gameId, season);
    const ttl = preview.completed ? 86400 : 900;
    if (preview.game) routeCache.set(cacheKey, preview, ttl);
    res.json(preview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch game preview' });
  }
});

export default router;
