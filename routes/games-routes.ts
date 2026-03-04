import express, { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { GamesRepo } from '../repos/games-repo';
import { getDefaultSeason } from '../lib/cfbd-client';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 1800 });
const gamesRepo = new GamesRepo();

router.get('/schedule/:team_name', async (req: Request, res: Response) => {
  const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `schedule_${teamName}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const schedule = await gamesRepo.getScheduleWithOdds(teamName, season);
    cache.set(cacheKey, JSON.stringify(schedule));
    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch schedule' });
  }
});

router.get('/games/:game_id', async (req: Request, res: Response) => {
  const gameId = Number(req.params.game_id);
  if (Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }
  const cacheKey = `game_detail_${gameId}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const detail = await gamesRepo.getGameDetail(gameId);
    if (!detail.game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    cache.set(cacheKey, JSON.stringify(detail));
    res.json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch game' });
  }
});

export default router;
