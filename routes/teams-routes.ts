import express, { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { TeamsRepo } from '../repos/teams-repo';
import { getDefaultSeason } from '../lib/cfbd-client';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });
const teamsRepo = new TeamsRepo();

router.get('/team/:team_id/information', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `team_info_${teamId}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const team = await teamsRepo.getTeamInfo(teamId, season);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    cache.set(cacheKey, JSON.stringify(team));
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch team' });
  }
});

router.get('/team/:team_id/players', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `roster_${teamId}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    // CFBD roster expects team school name; resolve if team_id is numeric
    let teamName = teamId;
    const idNum = Number(teamId);
    if (!Number.isNaN(idNum)) {
      const team = await teamsRepo.getTeamInfo(teamId, season);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      teamName = team.school;
    }
    const roster = await teamsRepo.getRoster(teamName, season);
    cache.set(cacheKey, JSON.stringify(roster));
    res.json(roster);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch roster' });
  }
});

router.get('/team/:team_id/coaches', async (req: Request, res: Response) => {
  const teamId = Array.isArray(req.params.team_id) ? req.params.team_id[0] : req.params.team_id;
  const season = req.query.season ? Number(req.query.season) : getDefaultSeason();
  const cacheKey = `coaches_${teamId}_${season}`;

  try {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    let teamName = teamId;
    const idNum = Number(teamId);
    if (!Number.isNaN(idNum)) {
      const team = await teamsRepo.getTeamInfo(teamId, season);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      teamName = team.school;
    }
    const coaches = await teamsRepo.getCoaches(teamName, season);
    cache.set(cacheKey, JSON.stringify(coaches));
    res.json(coaches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch coaches' });
  }
});

export default router;
