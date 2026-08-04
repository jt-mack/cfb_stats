import express, { Request, Response } from 'express';
import { ScheduleEnrichmentRepo } from '../repos/schedule-enrichment-repo';
import { ScoreboardRepo } from '../repos/scoreboard-repo';
import { RatingsRepo } from '../repos/ratings-repo';
import { DeepStatsRepo } from '../repos/deep-stats-repo';
import { cachedJson, parseSeasonQuery, parseWeekParam, parseYearParam } from '../lib/route-helpers';
import { getDefaultSeason } from '../lib/sdv';

const router = express.Router();
const enrichmentRepo = new ScheduleEnrichmentRepo();
const scoreboardRepo = new ScoreboardRepo();
const ratingsRepo = new RatingsRepo();
const deepStatsRepo = new DeepStatsRepo();

router.get('/schedule/:team_name/enrichment', async (req: Request, res: Response) => {
  const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  const cacheKey = `schedule_enrich_${teamName}_${season}`;
  await cachedJson(res, cacheKey, 900, () => enrichmentRepo.getEnrichmentForTeam(teamName, season));
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

router.get('/ratings/:year/team/:team_name', async (req: Request, res: Response) => {
  const year = parseYearParam(String(req.params.year));
  const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
  if (year == null) return res.status(400).json({ error: 'Invalid year' });

  await cachedJson(res, `ratings_${year}_${teamName}`, 3600, () => ratingsRepo.getTeamRatings(year, teamName));
});

router.get('/games/:game_id/drives', async (req: Request, res: Response) => {
  const gameId = Number(req.params.game_id);
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  try {
    const data = await deepStatsRepo.getDrivesForGame(gameId);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch drives' });
  }
});

router.get('/games/:game_id/plays', async (req: Request, res: Response) => {
  const gameId = Number(req.params.game_id);
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  try {
    const data = await deepStatsRepo.getPlaysForGame(gameId);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch plays' });
  }
});

router.get('/team/:team_name/recruiting', async (req: Request, res: Response) => {
  const teamName = Array.isArray(req.params.team_name) ? req.params.team_name[0] : req.params.team_name;
  const season = parseSeasonQuery(req.query.season);
  if (season == null) return res.status(400).json({ error: 'Invalid season' });

  try {
    const [recruiting, talent] = await Promise.all([
      deepStatsRepo.getRecruitingRankings(season, teamName),
      deepStatsRepo.getTalent(season),
    ]);
    const teamTalent = (talent ?? []).find((t) => t && t.team === teamName) ?? null;
    res.json({ recruiting, talent: teamTalent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch recruiting' });
  }
});

router.get('/info/usage', async (_req: Request, res: Response) => {
  res.json({
    source: 'sportsdataverse',
    provider: 'ESPN (unofficial)',
    monthlyLimit: null,
    message:
      'No API key or monthly quota — data served from ESPN public endpoints via SportsDataverse. ' +
      'No CollegeFootballData (CFBD). Power-index efficiencies are ESPN efficiencies, not CFBD PPA. ' +
      'Recruiting/talent may fall back to ESPN FPI with an explicit source field. ' +
      'Game advanced box scores are thin ESPN summary assemblies only.',
  });
});

export default router;
