import express, { Request, Response } from 'express';
import { ConferencesRepo } from '../repos/conferences-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';

const router = express.Router();
const conferencesRepo = new ConferencesRepo();

router.get('/conferences', async (_req: Request, res: Response) => {
  await cachedJson(res, 'conferences_main', 3600, () => conferencesRepo.getConferences());
});

function sortStandingsRecords<T extends {
  conferenceGames?: { wins?: number; losses?: number };
  total?: { wins?: number; losses?: number };
  team?: string;
}>(records: T[]): T[] {
  const rank = (r: T) => [
    -(r.conferenceGames?.wins ?? 0),
    r.conferenceGames?.losses ?? 0,
    -(r.total?.wins ?? 0),
    r.total?.losses ?? 0,
    (r.team ?? '').toLowerCase(),
  ];
  return [...records].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] < rb[i]) return -1;
      if (ra[i] > rb[i]) return 1;
    }
    return 0;
  });
}

/** FBS-wide standings (labeled as record listing, not an official ranking). */
router.get('/standings', async (req: Request, res: Response) => {
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  await cachedJson(res, `standings_fbs_${season}`, 3600, async () =>
    sortStandingsRecords(await conferencesRepo.getFbsRecords(season))
  );
});

router.get('/conferences/:conference_id/standings', async (req: Request, res: Response) => {
  const conferenceId = Array.isArray(req.params.conference_id)
    ? req.params.conference_id[0]
    : req.params.conference_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `standings_${conferenceId}_${season}`;
  await cachedJson(res, cacheKey, 3600, async () => {
    const records = await conferencesRepo.getConferenceRecords(
      (await conferencesRepo.resolveConferenceAbbr(conferenceId)) ?? conferenceId,
      season
    );
    return sortStandingsRecords(records);
  });
});

router.get('/teams/conference/:conference_id', async (req: Request, res: Response) => {
  const conferenceId = Array.isArray(req.params.conference_id)
    ? req.params.conference_id[0]
    : req.params.conference_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `teams_conf_${conferenceId}_${season}`;
  await cachedJson(res, cacheKey, 3600, async () => {
    const abbr = (await conferencesRepo.resolveConferenceAbbr(conferenceId)) ?? conferenceId;
    return conferencesRepo.getTeamsByConference(abbr, season);
  });
});

export default router;
