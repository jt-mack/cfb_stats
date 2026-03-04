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
import { getTeamInfo } from '../repos/teamsRepo';
import { getStandings } from '../repos/conferencesRepo';
import { getSchedule } from '../repos/gamesRepo';

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

    const season = globalState.season ? Number(globalState.season) : undefined;

    const loadTeamInfo = async (team_id) => {
        setLoading(true);
        const team = await getTeamInfo(team_id, season);

        const conferenceAbbr = team?.conference;
        if (conferenceAbbr) {
            const standingsData = await loadStandings(conferenceAbbr);
            if (standingsData) setStandings(standingsData);
        }

        const teamName = team?.school;
        let scheduleList = [];
        if (teamName) {
            scheduleList = await getSchedule(teamName, season);
            if (scheduleList && scheduleList.length) setSchedule(scheduleList);
        }

        const now = new Date();
        const nextGame = Array.isArray(scheduleList)
            ? scheduleList.find((g) => !g.completed && new Date(g.startDate) >= now)
            : null;
        if (nextGame) {
            setNextMatchup([{ ...nextGame, extraData: nextGame }]);
        }

        const color = team?.color ?? '000000';
        const alternateColor = team?.alternateColor ?? 'ffffff';
        handleStyleSet({ color: '#' + color, backgroundColor: '#' + alternateColor }, team.id);

        return team;
    };

    const loadStandings = async (conference_id) => {
        const matchingConference = globalState.conferences?.find(
            (c) => c.abbreviation === conference_id || c.shortName === conference_id || c.id == conference_id
        ) ?? {};
        setConference((prev) => ({ ...matchingConference }));
        return getStandings(conference_id, season);
    };

    const handleStyleSet = (style, teamId) => {
        localStorage.setItem(`team_style_${teamId}`, JSON.stringify(style));
        setStyle(style);
    };

    const handleTeamSet = (team) => {
        setTeam(team);
        setLoading(false);
    }


    useEffect(() => {
        loadTeamInfo(team_id)
            .then(handleTeamSet)
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
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


    const createTeamSummary = function (team, nextGameItem) {
        const title = team.mascot ? `${team.school} ${team.mascot}` : team.school;
        let nextGameStr = '—';
        if (nextGameItem?.startDate) {
            const d = new Date(nextGameItem.startDate).toLocaleDateString('en-US');
            const name = nextGameItem.awayTeam && nextGameItem.homeTeam
                ? `${nextGameItem.awayTeam} @ ${nextGameItem.homeTeam}`
                : 'TBD';
            nextGameStr = `${name} on ${d}`;
        }
        const recordStr = standings
            ? (() => {
                const r = standings.find((rec) => rec.teamId === team.id || rec.team === team.school);
                return r?.total ? `${r.total.wins}-${r.total.losses}` : '0-0';
            })()
            : '0-0';
        return {
            id: team.id,
            abbreviation: team.abbreviation,
            title,
            conferenceLogo: conference?.logo,
            logo: team.logos?.[0] ?? '',
            "Next Game": nextGameStr,
            record: recordStr,
            rank: team.rank,
            standing: null
        };
    }

    const createStandingsProps = (records) => {
        if (!Array.isArray(records)) return [];
        return records.map((rec) => ({
            name: rec.team,
            id: rec.teamId,
            logo: '',
            record: rec.total ? `${rec.total.wins}-${rec.total.losses}` : '—',
            conferenceRecord: rec.conferenceGames ? `${rec.conferenceGames.wins}-${rec.conferenceGames.losses}` : '—'
        }));
    };

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

    const { abbreviation } = team;
    const { color, alternateColor } = style;
    const nextGameForSummary = Array.isArray(nextMatchup) && nextMatchup[0] ? nextMatchup[0] : null;


    return (<>


            <Row className={"p-2"}>
                {loading ?
                    <Row style={{height: '90vh'}} className='justify-content-center'>
                        <Spinner animation="grow" style={{color: style.color}} className='mx-auto'/>
                    </Row>
                    : <>
                        <Col xs={12} sm={12}>

                                    {team && team.school && <Row>

                                            <TeamCard customStyle={style} {...createTeamSummary(team, nextGameForSummary)} favorite={favorite}
                                                      links={team.links ?? []}
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
                                                        <Roster id={team.id} slug={team.school} season={globalState.season} />
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