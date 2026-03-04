import React, {useState, useEffect} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {Row, Col, ListGroup, Spinner, Tabs,Tab} from 'react-bootstrap';
import {camelCaseToProperCase} from "../helpers/stringHelpers";
import {useGlobalState} from "../App";

import NextEvent from './partials/NextMatchup';
import TeamCard from '../components/cards/TeamCard';
import BarChart from '../components/charts/BarChart';
import StandingsTable from "../components/tables/standingsTable";
import Schedule from "../components/tables/schedule";
import Roster from './partials/Roster';

const getFavorites = (team_id) => {
    const favorites = JSON.parse(localStorage.getItem("favorites"));
    if (favorites) {

        const isFavorite = favorites.find(favorite => favorite.id === team_id);
        if (isFavorite) {

            return isFavorite;

        }
        return false
    }
}

function Team() {
    const {team_id} = useParams();

    const {globalState, setGlobalState} = useGlobalState();


    const [conference, setConference] = useState();

    const [tab, setTab] = useState('schedule');


    const [team, setTeam] = useState({});
    const [nextMatchup, setNextMatchup] = useState(null);
    const [standings, setStandings] = useState(null);
    const [loading, setLoading] = useState(false);

    const [schedule, setSchedule] = useState([]);


    const cachedStyle = localStorage.getItem(`team_style_${team_id}`);
    const [style, setStyle] = useState(cachedStyle ? JSON.parse(cachedStyle) : {});

    const [favorite, setFavorite] = useState(getFavorites(team_id));

    const getTeamInfo = async (team_id, season) => {
        setLoading(true);

        const response = await fetch(`/api/cfb/team/${team_id}/information?season=${globalState.season}`);
        const team = await response.json();
        if (response.status !== 200) {
            throw Error(team)
        }



        const {standings} = await getStandings(team.groups.id);

        if (standings) {
            setStandings(standings);
        }

        const teamName = team?.nickname ?? team?.shortDisplayName;

        if (teamName) {
            const schedule = await getSchedule(teamName);
            if (schedule) {
                setSchedule(schedule);
                console.log({schedule});
            }
        }

        let {nextEvent} = team;

        if (nextEvent) {
            const matchingGameFromSchedule = schedule.find(({id}) => id == nextEvent[0]?.id);
            console.log({matchingGameFromSchedule, nextEvent});
            if(matchingGameFromSchedule) {
                nextEvent[0]['extraData']={...matchingGameFromSchedule};
            }
            setNextMatchup(nextEvent);
        }

        const {color, alternateColor} = team;
        handleStyleSet({color: "#" + color, backgroundColor: "#" + alternateColor}, team.id);

        return team;

    }

    const getSchedule = async (team_name) => {
        const response = await fetch(`/api/cfb/v2/schedule/${team_name}?season=${globalState.season}`);
        const schedule = await response.json();
        if (response.status !== 200) {
            throw Error(standings)
        }

        return schedule;
    }

    const getStandings = async (conference_id) => {
        const matchingConference = globalState.conferences?.find(({id}) => id == conference_id) ?? {};
        setConference((prevState) => ({...matchingConference}));
        const response = await fetch(`/api/cfb/conferences/${conference_id}/standings?season=${globalState.season}`);
        const standings = await response.json();
        if (response.status !== 200) {
            throw Error(standings)
        }

        return standings;
    }

    const handleStyleSet = (style, teamId) => {
        localStorage.setItem(`team_style_${teamId}`, JSON.stringify(style));
        setStyle(style);
    };

    const handleTeamSet = (team) => {
        setTeam(team);
        setLoading(false);
    }


    useEffect(() => {

        getTeamInfo(team_id)
            .then(handleTeamSet)
            .catch(err => {
                console.error(err)
                setLoading(false);
            })
    }, [globalState.season]);


    useEffect(() => {
        const favorites = JSON.parse(localStorage.getItem("favorites"));
        if (favorites && favorites.length > 0) {
            const isFavorite = favorites.find(favorite => favorite.id === team_id);
            if (isFavorite) {
                setFavorite(isFavorite);
            }
        }
    }, [])

    const makeFavorite = () => {

        const favorites = JSON.parse(localStorage.getItem("favorites"));
        if (favorites) {

            const isFavorite = favorites.find(favorite => favorite.id === team_id);
            if (isFavorite) {
                setFavorite(isFavorite);
                return;
            }
            favorites.push({name: team.abbreviation, id: team.id})
            localStorage.setItem("favorites", JSON.stringify(favorites))
            setFavorite({name: team.abbreviation, id: team.id})
        }
    }


    const createTeamSummary = function (team) {


        let {id, abbreviation, displayName, logos, nextEvent, record, standingSummary, rank} = team;

        let short_date;
        let short_name;
        if (nextEvent && nextEvent[0]) {
            short_date = nextEvent[0]?.date;
            short_name = nextEvent[0]?.name;
            if (short_date) {
                short_date = new Date(nextEvent[0].date).toLocaleDateString('en-US')
            }
        }

        console.log({standingSummary});
        return {
            id,
            abbreviation,
            title: displayName,
            conferenceLogo: conference?.logo,
            logo: logos[0]?.href,
            "Next Game": `${short_name} on ${short_date}`,
            record: record?.items?.[0] || "0-0",
            rank,
            standing: standingSummary
        }
    }

    const createStandingsProps = (standings) => {
        return standings?.entries?.map(({team, stats}) => ({
            name: team.displayName,
            id: team.id,
            logo: team.logos[0]?.href,
            rank: team.rank,
            record: stats?.find(({name}) => name === "overall")?.displayValue ?? "Unknown",
            conferenceRecord: stats?.find(({abbreviation}) => abbreviation === "CONF")?.displayValue ?? "Unknown",
        }))
    }

    const createDataSetsFromTeamRecordStats = (stats, teamInfo) => {
        const {color, alternateColor, abbreviation} = teamInfo;
        var data = stats.map((stat) => stat.value >= 5 && stat.name.toLowerCase().includes("points") && stat)
            .filter(x => x);

        const labels = data.map(({name}) => camelCaseToProperCase(name));

        const datasets = [{
            label: abbreviation,
            backgroundColor: "#" + color,
            borderColor: "#" + alternateColor,
            data: data.map(({value}) => value),
        }]

        return {
            labels,
            datasets
        }
    }

    const {abbreviation, links} = team;
    const {color, alternateColor} = style;


    return (<>


            <Row className={"p-2"}>
                {loading ?
                    <Row style={{height: '90vh'}} className='justify-content-center'>
                        <Spinner animation="grow" style={{color: style.color}} className='mx-auto'/>
                    </Row>
                    : <>
                        <Col xs={12} sm={12}>

                                    {team && team["displayName"] && <Row>

                                            <TeamCard customStyle={style} {...createTeamSummary(team)} favorite={favorite}
                                                      links={links}
                                                      makeFavorite={makeFavorite}>
                                                <Tabs
                                                    id="team-tabs"
                                                    activeKey={tab}
                                                    onSelect={(k) => setTab(k)}
                                                    className="mb-3 link-light"
                                                    justify
                                                >
                                                    <Tab eventKey="schedule" title="Schedule">
                                                        <>
                                                        {schedule && <Schedule schedule={schedule} conference={conference} team={team} style={style}/>}
                                                        </>
                                                    </Tab>
                                                    <Tab eventKey="standings" title="Standings">
                                                        <>
                                                        {standings && <StandingsTable standings={createStandingsProps(standings)}
                                                                                      activeTeam={{id: team_id, style}}/>}
                                                        </>
                                                    </Tab>
                                                    <Tab eventKey="next-matchup" title="Next Game">
                                                        <>
                                                        {nextMatchup && nextMatchup[0] ? <NextEvent {...nextMatchup[0]}  /> :
                                                            <p>This team is coming up on a bye week. Check back next week.</p>}
                                                        </>
                                                    </Tab>
                                                    <Tab eventKey="roster" title="Roster">
                                                        <Roster id={team.id} slug={team.name} />
                                                    </Tab>
                                                </Tabs>

                                            </TeamCard>

                                    </Row>}


                        </Col>
                        <Col xs={12} sm={12}>

                        </Col></>
                }
            </Row>

        </>
    );

}

export default Team;