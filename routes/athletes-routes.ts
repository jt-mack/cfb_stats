import express, { Request, Response } from 'express';
import { AthletesRepo } from '../repos/athletes-repo';
import { cachedJson } from '../lib/route-helpers';

const router = express.Router();
const athletesRepo = new AthletesRepo();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function parseAthleteId(value: string): string | null {
  return /^\d+$/.test(value) ? value : null;
}

router.get('/athlete/:athlete_id/stats', async (req: Request, res: Response) => {
  const athleteId = parseAthleteId(param(req.params.athlete_id));
  if (!athleteId) return res.status(400).json({ error: 'Invalid athlete id' });

  await cachedJson(res, `athlete_stats_${athleteId}`, 3600, () => athletesRepo.getAthleteStats(athleteId));
});

router.get('/athlete/:athlete_id', async (req: Request, res: Response) => {
  const athleteId = parseAthleteId(param(req.params.athlete_id));
  if (!athleteId) return res.status(400).json({ error: 'Invalid athlete id' });

  await cachedJson(res, `athlete_${athleteId}`, 3600, async () => {
    const athlete = await athletesRepo.getAthlete(athleteId);
    if (!athlete) {
      const err = new Error('Athlete not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return athlete;
  });
});

export default router;
