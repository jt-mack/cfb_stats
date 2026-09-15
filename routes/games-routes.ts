import express, { Request, Response } from 'express';
import { GamesRepo } from '../repos/games-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';

const router = express.Router();
const gamesRepo = new GamesRepo();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get('/games/:game_id', async (req: Request, res: Response) => {
  const gameId = Number(param(req.params.game_id));
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  await cachedJson(res, `game_detail_${gameId}`, 900, async () => {
    const detail = await gamesRepo.getGameDetail(gameId);
    if (!detail.game) {
      const err = new Error('Game not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return detail;
  });
});

router.get('/preview/:game_id', async (req: Request, res: Response) => {
  const gameId = Number(param(req.params.game_id));
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  await cachedJson(res, `game_preview_${gameId}_${season}`, 900, () =>
    gamesRepo.getGamePreview(gameId, season)
  );
});

router.get('/games/:game_id/drives', async (req: Request, res: Response) => {
  const gameId = Number(param(req.params.game_id));
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  await cachedJson(res, `game_drives_${gameId}`, 900, () => gamesRepo.getDrivesForGame(gameId));
});

router.get('/games/:game_id/plays', async (req: Request, res: Response) => {
  const gameId = Number(param(req.params.game_id));
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  await cachedJson(res, `game_plays_${gameId}`, 900, () => gamesRepo.getPlaysForGame(gameId));
});

export default router;
