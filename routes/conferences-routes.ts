import express, { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { ConferencesRepo } from '../repos/conferences-repo';
import { getDefaultSeason } from '../lib/cfbd-client';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });
const conferencesRepo = new ConferencesRepo();

router.get('/conferences', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'conferences';
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const conferences = await conferencesRepo.getConferences();
    cache.set(cacheKey, JSON.stringify(conferences));
    res.json(conferences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch conferences' });
  }
});

router.get('/conferences/:conference_id/standings', async (req: Request, res: Response) => {
  const conferenceId = Array.isArray(req.params.conference_id) ? req.params.conference_id[0] : req.params.conference_id;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `standings_${conferenceId}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const records = await conferencesRepo.getConferenceRecords(conferenceId, season);
    type Rec = { conferenceGames?: { wins?: number; losses?: number }; total?: { wins?: number; losses?: number }; team?: string };
    const rank = (r: Rec) => [
      -(r.conferenceGames?.wins ?? 0),
      r.conferenceGames?.losses ?? 0,
      -(r.total?.wins ?? 0),
      r.total?.losses ?? 0,
      (r.team ?? '').toLowerCase(),
    ];
    const sorted = [...records].sort((a, b) => {
      const ra = rank(a as Rec), rb = rank(b as Rec);
      for (let i = 0; i < ra.length; i++) {
        if (ra[i] < rb[i]) return -1;
        if (ra[i] > rb[i]) return 1;
      }
      return 0;
    });
    cache.set(cacheKey, JSON.stringify(sorted));
    res.json(sorted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch standings' });
  }
});

router.get('/teams/conference/:conference_id', async (req: Request, res: Response) => {
  const conferenceId = Array.isArray(req.params.conference_id) ? req.params.conference_id[0] : req.params.conference_id;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `teams_conf_${conferenceId}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const teams = await conferencesRepo.getTeamsByConference(conferenceId, season);
    cache.set(cacheKey, JSON.stringify(teams));
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch conference teams' });
  }
});

export default router;
