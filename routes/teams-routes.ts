import express, { Request, Response } from 'express';
import { TeamsRepo } from '../repos/teams-repo';
import { cachedJson, parseSeasonQuery } from '../lib/route-helpers';
import { routeCache } from '../lib/cache';

const router = express.Router();
const teamsRepo = new TeamsRepo();

router.get('/team/:team_id/information', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `team_info_${teamId}_${season}`;
  const cached = routeCache.get<unknown>(cacheKey);
  if (cached !== undefined) return res.json(cached);

  try {
    const team = await teamsRepo.getTeamInfo(teamId, season);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    routeCache.set(cacheKey, team, 3600);
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch team' });
  }
});

router.get('/team/:team_id/players', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  let teamName = teamId;
  const idNum = Number(teamId);
  if (!Number.isNaN(idNum)) {
    const team = await teamsRepo.getTeamInfo(teamId, season);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    teamName = team.school;
  }

  const cacheKey = `roster_${teamId}_${season}`;
  await cachedJson(res, cacheKey, 3600, () => teamsRepo.getRoster(teamName, season));
});

router.get('/team/:team_id/coaches', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  let teamName = teamId;
  const idNum = Number(teamId);
  if (!Number.isNaN(idNum)) {
    const team = await teamsRepo.getTeamInfo(teamId, season);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    teamName = team.school;
  }

  const cacheKey = `coaches_${teamId}_${season}`;
  await cachedJson(res, cacheKey, 3600, () => teamsRepo.getCoaches(teamName, season));
});

export default router;
