import express, { Request, Response } from 'express';
import { TeamsRepo } from '../repos/teams-repo';
import { teamIndex } from '../lib/team-index';
import { cachedJson, parseSeasonQuery, parseYearParam } from '../lib/route-helpers';
import { getDefaultSeason } from '../lib/espn-client';

const router = express.Router();
const teamsRepo = new TeamsRepo();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get('/team/:team_id/information', async (req: Request, res: Response) => {
  const teamId = param(req.params.team_id);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  await cachedJson(res, `team_info_${teamId}_${season}`, 3600, async () => {
    const team = await teamsRepo.getTeamInfo(teamId, season);
    if (!team) {
      const err = new Error('Team not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return team;
  });
});

router.get('/team/:team_id/players', async (req: Request, res: Response) => {
  const teamId = param(req.params.team_id);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const school = await teamIndex.resolveSchoolName(teamId, season);
  if (!school) return res.status(404).json({ error: 'Team not found' });

  await cachedJson(res, `roster_${teamId}_${season}`, 3600, () => teamsRepo.getRoster(school, season));
});

router.get('/team/:team_id/coaches', async (req: Request, res: Response) => {
  const teamId = param(req.params.team_id);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const school = await teamIndex.resolveSchoolName(teamId, season);
  if (!school) return res.status(404).json({ error: 'Team not found' });

  await cachedJson(res, `coaches_${teamId}_${season}`, 3600, () => teamsRepo.getCoaches(school, season));
});

router.get('/schedule/:team_name', async (req: Request, res: Response) => {
  const teamName = param(req.params.team_name);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const ttl = season === getDefaultSeason() ? 900 : 1800;
  await cachedJson(res, `schedule_${teamName}_${season}`, ttl, () =>
    teamsRepo.getScheduleWithOdds(teamName, season)
  );
});

router.get('/schedule/:team_name/enrichment', async (req: Request, res: Response) => {
  const teamName = param(req.params.team_name);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  await cachedJson(res, `schedule_enrich_${teamName}_${season}`, 900, () =>
    teamsRepo.getScheduleEnrichment(teamName, season)
  );
});

router.get('/team/:team_id/news', async (req: Request, res: Response) => {
  const teamId = param(req.params.team_id);
  const limit = Math.min(Number(req.query.limit ?? 15) || 15, 30);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const resolvedId = await teamIndex.resolveTeamId(teamId, season);
  if (!resolvedId) return res.status(404).json({ error: 'Team not found' });
  await cachedJson(res, `team_news_${resolvedId}_${limit}`, 600, () =>
    teamsRepo.getTeamNews(String(resolvedId), season, limit)
  );
});

router.get('/team/:team_id/leaders', async (req: Request, res: Response) => {
  const teamId = param(req.params.team_id);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });
  const resolved = await teamIndex.resolveTeamId(teamId, season);
  if (!resolved) return res.status(404).json({ error: 'Team not found' });
  await cachedJson(res, `team_leaders_${resolved}_${season}`, 1800, () =>
    teamsRepo.getTeamLeaders(String(resolved), season)
  );
});

router.get('/ratings/:year/team/:team_name', async (req: Request, res: Response) => {
  const year = parseYearParam(String(req.params.year));
  const teamName = param(req.params.team_name);
  if (year == null) return res.status(400).json({ error: 'Invalid year' });

  await cachedJson(res, `ratings_${year}_${teamName}`, 3600, () => teamsRepo.getTeamRatings(year, teamName));
});

router.get('/team/:team_name/recruiting', async (req: Request, res: Response) => {
  const teamName = param(req.params.team_name);
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  await cachedJson(res, `recruiting_${teamName}_${season}`, 3600, () =>
    teamsRepo.getRecruiting(teamName, season)
  );
});

export default router;
