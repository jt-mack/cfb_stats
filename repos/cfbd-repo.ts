import { client, getGames, getPregameWinProbabilities, getRoster } from 'cfbd'
import dotenv from 'dotenv'

dotenv.config();
const cfbDataAPIkey = process.env.CFBDATA_APIKEY;

client.setConfig({
    headers: {
        'Authorization': `Bearer ${cfbDataAPIkey}`,
    }
})

class CFBDRepo {

    async getSchedule(team: string, year: number) {
        return await getGames({
            query: {
                year,
                team
            }
        })
    }

    async getOdds(team:string,year:number) {
        return await getPregameWinProbabilities({
            query:{
                year,
                team
            }
        })
    }

    async getRoster(team:string,year:number){
        return await getRoster({
            query:{
                year,
                team
            }
        })
    }
}

export default CFBDRepo;