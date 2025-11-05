import {useState, useEffect} from 'react';
import {Row, Col} from 'react-bootstrap';
import ImageCard from '../../components/cards/ImageCard';
import PlayerCard from '../../components/cards/PlayerCard';
import BarChart from '../../components/charts/BarChart';
import WinPercentage from "../../components/odds/WinPercentage";

const NextMatchup = (props) => {
    const {name, id, extraData} = props;
    console.log({props})

    const [matchup, setMatchup] = useState(null);
    const [game, setGame] = useState(null);
    const [gameInfo, setGameInfo] = useState(null);
    const [boxScore, setBoxScore] = useState(null);
    const [picks, setPicks] = useState(null);
    const [homeTeam, setHomeTeam] = useState(null);

    const getMatchupData = async function (game_id) {
        const result = await fetch(`/api/cfb/games/${game_id}`)
        const matchup = await result.json();
        let {game, picks} = matchup;
        if (game) {
            setGame(game);
            let {gameInfo, boxScore} = game;
            if (gameInfo) {
                setGameInfo(gameInfo);
            }

            if (boxScore) {
                setBoxScore(boxScore);
                const hTeam=boxScore?.teams?.find(team => team.homeAway === "home")?.team;
                if(hTeam){
                    setHomeTeam(hTeam);
                }
            }

        }
        if (picks) {
            console.log({picks})
            setPicks(picks);
        }
        return matchup;
    }

    useEffect(() => {
        getMatchupData(id)
            .then(matchup => setMatchup(matchup))
    }, []);

    const createPlayerCardsForTeamLeaders = (leaders) => {
        const team_leaders = leaders.map((leader, index) => {

            const {team, leaders} = leader;
            team["statLeaders"] = {};
            const playerProps = leaders.map(({name, displayName, leaders}) => {
                const {athlete, displayValue} = leaders[0];
                athlete["team"] = team;
                const propsObject = {
                    player: athlete,
                    stats: {
                        stat_type: displayName,
                        stat: displayValue
                    }
                };

                return propsObject;
            })
            team["statLeaders"] = playerProps;
            return team;


        })


        return <Row>
            {team_leaders.map((team, index) => {
                const {statLeaders} = team;


                return <Col sm={12} md={6} className="mb-3" key={index}>
                    <Row className={"p-0"}>
                        <h5 className={'text-center text-light'}>{team.abbreviation} Key Players</h5>
                        {statLeaders.map((playerStats, index) => (
                            <Col xs={4} md={4} className={"p-1"} key={index}>
                                <PlayerCard key={index} {...playerStats} />
                            </Col>)
                        )}
                    </Row>
                </Col>


            })}
        </Row>


    }

    const createPropsForImgCard = (matchup) => {
        let {game} = matchup;
        let {gameInfo} = game;
        if (!game || !gameInfo) {
            return;
        }
        const venueName = gameInfo?.venue?.fullName;
        const temp = gameInfo?.weather?.temperature;
        const chanceOfRain = gameInfo?.weather?.precipitation;
        const weatherSummary = temp && chanceOfRain ? `${temp} degrees with a ${chanceOfRain}% chance of rain` : '';

        return {
            title: name,
            imgSrc: gameInfo?.venue?.images[0]?.href,
            imgName: venueName,
            text: venueName,
            sub_text: weatherSummary
        }
    }

    const createDataSetsFromBoxScore = (boxScore) => {

        const {teams} = boxScore;
        const labels = teams[0].statistics.map(({label}) => label)
        const datasets = teams.map(({team, statistics}) => {
            return {
                label: team.displayName,
                backgroundColor: "#" + team.color,
                borderColor: "#" + team.alternateColor,

                data: statistics.map(({displayValue}) => parseFloat(displayValue)),
            }
        })
        return {
            labels,
            datasets
        }
    }


    return (<>
            <Row>

                {matchup && gameInfo && gameInfo["venue"] &&
                    <Col md={6}>
                        <ImageCard {...createPropsForImgCard(matchup)}/>
                    </Col>
                }
                {matchup && matchup["game"] && game && boxScore && boxScore["teams"] &&
                    <Col md={6}>

                        <BarChart {...createDataSetsFromBoxScore(boxScore)} />
                    </Col>
                }
                {game && game?.odds?.homeWinProbability && <Col md={2} className={'text-center align-items-center my-auto text-dark'}>
                    <WinPercentage logoUrl={homeTeam.logo}
                                   percentage={((game?.odds?.homeWinProbability ?? 1) * 100).toFixed(2)}
                                   size={200}
                                   color={homeTeam?.color ? `#${homeTeam.color}` : 'gray'}/>
                    <h4>{extraData?.odds?.spread > 0 ? `+${extraData?.odds.spread}` : extraData?.odds.spread}</h4>
                </Col>}

            </Row>

            {matchup && createPlayerCardsForTeamLeaders(matchup.picks.leaders)}

        </>
    )

}

export default NextMatchup;