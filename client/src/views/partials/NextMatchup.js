import { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import ImageCard from '../../components/cards/ImageCard';
import PlayerCard from '../../components/cards/PlayerCard';
import BarChart from '../../components/charts/BarChart';
import WinPercentage from '../../components/odds/WinPercentage';
import { getGameDetail } from '../../repos/gamesRepo';

const NextMatchup = (props) => {
    const { name, id, extraData } = props;
    const [detail, setDetail] = useState(null);
    const [game, setGame] = useState(null);
    const [gameInfo, setGameInfo] = useState(null);
    const [boxScore, setBoxScore] = useState(null);
    const [leaders, setLeaders] = useState(null);
    const [homeTeamName, setHomeTeamName] = useState(null);

    useEffect(() => {
        if (!id) return;
        getGameDetail(Number(id))
            .then((d) => {
                setDetail(d);
                setGame(d.game);
                if (d.game) {
                    setHomeTeamName(d.game.homeTeam);
                    setGameInfo({
                        venue: d.game.venue ? { fullName: d.game.venue } : null,
                        ...d.advancedBoxScore?.gameInfo
                    });
                }
                if (d.teamStats && d.teamStats.length > 0 && d.teamStats[0].teams) {
                    const teams = d.teamStats[0].teams;
                    setBoxScore({
                        teams: teams.map((t) => ({
                            team: { displayName: t.team, color: null, alternateColor: null },
                            statistics: (t.stats || []).map((s) => ({ label: s.category, displayValue: s.stat }))
                        }))
                    });
                }
                if (d.playerStats && d.playerStats.length > 0) {
                    const teamGroups = [];
                    d.playerStats[0].teams?.forEach((t) => {
                        const statLeaders = [];
                        t.categories?.forEach((cat) => {
                            cat.types?.forEach((type) => {
                                const first = type.athletes?.[0];
                                if (first) {
                                    statLeaders.push({
                                        player: { id: first.id, name: first.name, displayName: first.name },
                                        stats: { stat_type: type.name, stat: first.stat }
                                    });
                                }
                            });
                        });
                        if (statLeaders.length) {
                            teamGroups.push({ team: { abbreviation: t.team, displayName: t.team }, statLeaders });
                        }
                    });
                    setLeaders(teamGroups);
                }
            })
            .catch(console.error);
    }, [id]);

    const createPropsForImgCard = () => {
        const venueName = game?.venue ?? gameInfo?.venue?.fullName ?? 'Stadium';
        return {
            title: name ?? (game ? `${game.awayTeam} @ ${game.homeTeam}` : 'Game'),
            imgSrc: null,
            imgName: venueName,
            text: venueName,
            sub_text: ''
        };
    };

    const createDataSetsFromBoxScore = (box) => {
        if (!box?.teams?.length) return { labels: [], datasets: [] };
        const labels = box.teams[0].statistics?.map((s) => s.label) ?? [];
        const datasets = box.teams.map((t) => ({
            label: t.team?.displayName ?? t.team,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderColor: 'rgba(0,0,0,0.5)',
            data: (t.statistics ?? []).map((s) => parseFloat(s.displayValue) || 0)
        }));
        return { labels, datasets };
    };

    const homeWinProb = extraData?.odds?.homeWinProbability ?? game?.homePostgameWinProbability ?? gameInfo?.homeWinProb;
    const spread = extraData?.odds?.spread;

    return (
        <>
            <Row>
                {detail && game?.venue && (
                    <Col md={6}>
                        <ImageCard {...createPropsForImgCard()} />
                    </Col>
                )}
                {detail && game && boxScore && boxScore.teams?.length > 0 && (
                    <Col md={6}>
                        <BarChart {...createDataSetsFromBoxScore(boxScore)} />
                    </Col>
                )}
                {game && (homeWinProb != null || spread != null) && (
                    <Col md={2} className="text-center align-items-center my-auto text-dark">
                        {homeWinProb != null && (
                            <WinPercentage
                                logoUrl=""
                                percentage={((Number(homeWinProb)) * 100).toFixed(2)}
                                size={200}
                                color="gray"
                            />
                        )}
                        {spread != null && (
                            <h4>{spread > 0 ? `+${spread}` : spread}</h4>
                        )}
                    </Col>
                )}
            </Row>
            {leaders && leaders.length > 0 && (
                <Row className="mt-3">
                    {leaders.map((item, idx) => (
                        <Col sm={12} md={6} className="mb-3" key={idx}>
                            <Row className="p-0">
                                <h5 className="text-center text-light">{item.team?.abbreviation ?? item.team?.displayName} Key Players</h5>
                                {item.statLeaders?.map((playerStats, i) => (
                                    <Col xs={4} md={4} className="p-1" key={i}>
                                        <PlayerCard {...playerStats} />
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                    ))}
                </Row>
            )}
        </>
    );
};

export default NextMatchup;
