import express from 'express';
const router = express.Router();

import NodeCache from 'node-cache';

const cfbCache = new NodeCache();


import CFBDRepo from '../repos/cfbd-repo'

const cfbdRepo = new CFBDRepo();



router.get('/teams', async (req, res) => {
    const { season } = req.query;

    //todo
});

router.get('/conferences', async (req, res) => {
    const { season } = req.query;
    //todo
});

router.get('/conferences/:conference_id/standings', async (req, res) => {
    //todo
});

router.get('/teams/conference/:conference_id', async (req, res) => {
    //todo
});


router.get('/team/:team_id/information', async (req, res) => {
    //todo
});

// router.get('/team/:team_id/players', async (req, res) => {
//     const {team_id} = req.params;
//     const {season} = req.query;
//     try {
//         // if(cfbCache.has(`teamPlayers_${team_id}`)){
//         //     const cachedTeamPlayers=cfbCache.get(`teamPlayers_${team_id}`)
//         //     return res.json(JSON.parse(cachedTeamPlayers))
//         // }
//         const {team} = await sdv.cfb.getTeamPlayers(team_id);
//         const {athletes} =team
//         cfbCache.set(`teamPlayers_${team_id}`,JSON.stringify(athletes));
//         res.json(athletes);

//     } catch (error) {
//         console.error({error})
//         res.status(error.response.status).json({error})
//     }
// });
router.get('/team/:team_id/players', async (req, res) => {
    const { team_id } = req.params;
    const season = parseInt(req?.query?.season?.toString() ?? '2025') as number;
    try {
        // if(cfbCache.has(`teamPlayers_${team_id}`)){
        //     const cachedTeamPlayers=cfbCache.get(`teamPlayers_${team_id}`)
        //     return res.json(JSON.parse(cachedTeamPlayers))
        // }

        const athletes = await cfbRepo.doFetch(`roster?team=${team_id}&year=${season}`);

        cfbCache.set(`teamPlayers_${team_id}`, JSON.stringify(athletes));
        res.json(athletes);

    } catch (error) {
        console.error({ error })
        res.status(error.response.status).json({ error })
    }
});

router.get('/schedule/:team_name', async (req, res) => {
    const { team_name } = req.params;
    const season = parseInt(req?.query?.season?.toString() ?? '2025') as number;
    try {

        if (cfbCache.has(`schedule_${team_name}_${season}`)) {
            const cachedGame = cfbCache.get(`schedule_${team_name}_${season}`) as string;
            return res.json(JSON.parse(cachedGame));
        }
        const { data: schedule, error } = await cfbdRepo.getSchedule(team_name, season);
        if (!schedule) {
            console.error({ error })
            throw new Error("Whoops")
        }

        const { data: odds, error: oddsError } = await cfbdRepo.getOdds(team_name, season);
        if (!odds) {
            console.error({ oddsError });
        }

        const result = schedule.map((game) => {
            const oddsMatch = odds?.find((odd) => odd.gameId == game.id);
            if (oddsMatch) {
                // game.odds = odds
                //TODO;
            }
            return game;
        })

        cfbCache.set(`schedule_${team_name}_${season}`, JSON.stringify(result))
        res.json(result);

    } catch (error) {
        console.error({ error })
        res.status(404).json({ error })
    }
});

router.get('/games/:game_id', async (req, res) => {
    //todo
});


export default router;
