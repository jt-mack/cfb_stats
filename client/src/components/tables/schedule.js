import Table from 'react-bootstrap/Table';
import { Card, Row, Col, Tabs, Tab } from "react-bootstrap";

import { BsHouseFill, BsSignpost2Fill } from "react-icons/bs";

import WinPercentage from "../odds/WinPercentage";

function isHomeTeam(game, team) {
    return game.homeTeam === team;
}

function IconForTeam({ game, team }) {
    return isNeutralSite(game) ? <></> : isHomeTeam(game, team) ? <BsHouseFill /> : <BsSignpost2Fill />
}

function teamWon(game, team) {
    return game.homeTeam === team && game.homePoints > game.awayPoints || game.awayTeam === team && game.awayPoints > game.homePoints;
}

function isNeutralSite(game) {
    return !!game.neutralSite;
}

function variantColor(game, teamName) {
    return isNeutralSite(game) ? 'warning' : isHomeTeam(game, teamName) ? "none" : "danger";
}

function textColor(game, teamName) {
    return isHomeTeam(game, teamName) ? "dark" : "dark";
}

const spreadDisplay = (game) =>  <div>
        <p> {game.odds.homeTeam} {game?.odds?.spread > 0 ? `+${game.odds.spread}` : game.odds.spread}</p>
    </div>

const standingsTable = (props) => <>
    <Row className={"g-3"}>
        {props.schedule?.map((game, index) => <Col key={index} xs={12} sm={6} md={6} lg={6} xl={4}>
            <Card border={variantColor(game, props?.team?.school)}
                text={textColor(game, props?.team?.school)}>
                <Card.Header
                    className={'d-flex justify-content-between'}>
                    <div className={'my-auto d-flex gap-1 align-items-center'}><span>Week {game.week} </span> {game?.conferenceGame &&
                        <span> <img src={props.conference?.logo} className='table-image'
                            alt={props.conference?.name} /></span>}
                    </div>
                    {game?.startDate ? <div className="text-center text-small small"> {new Date(game?.startDate).toLocaleDateString('en-us')} <span> {new Date(game?.startDate).toLocaleTimeString('en-us', { timeStyle: "short" })}</span> </div> : <div>TBD</div>}

                    <div className={'my-auto d-flex gap-1 align-items-center'}><span>{game.venue} </span><IconForTeam game={game}
                        team={props.team?.nickname} /></div>


                </Card.Header>
                <Card.Body>

                    <Row className={'d-flex justify-content-between'}>
                        <Col xs={8} className={'my-auto'}>
                            <Table size={'sm'}
                                className={""} hover={false}>
                                <thead>
                                    <tr>
                                        <th></th>
                                        {game?.homeLineScores?.length > 0 && game.homeLineScores.map((score, i) => <th className="mx-auto text-center">{i >= 4 ? "OT" : i + 1}</th>)}
                                        <th className="mx-auto text-end">{game?.completed ? "F" : ""}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{game?.awayTeam}</td>
                                        {game?.awayLineScores?.length > 0 && game.awayLineScores.map((score, i) => <td className="mx-auto text-center">{score}</td>)}
                                        <td className={'text-end fw-bold'}>{game?.awayPoints}</td>

                                    </tr>
                                    <tr>
                                        <td>{game?.homeTeam}</td>
                                        {game?.homeLineScores?.length > 0 && game.homeLineScores.map((score, i) => <td className="mx-auto text-center">{score}</td>)}
                                        <td className={'text-end fw-bold'}>{game?.homePoints}</td>

                                    </tr>
                                </tbody>
                            </Table>
                        </Col>


                        <Col className={'my-auto text-center small'}>
                            {game?.completed && (teamWon(game, props.team?.nickname) ?
                                <h1 className={'fw-bold ' + 'text-success'}>W</h1> :
                                <h1 className={'fw-bold ' + 'text-danger'}>L</h1>)}
                            {!game?.completed && game?.odds?.homeWinProbability && <div className={'d-flex justify-content-center gap-2 text-center align-items-center'}>
                                <WinPercentage logoUrl={props?.team?.logos?.[0] ?? ''} percentage={((isHomeTeam(game, props.team?.nickname) ? (game?.odds?.homeWinProbability ?? 1) : (1 - game?.odds?.homeWinProbability ?? 1)) * 100).toFixed(2)}

                                    small={true}
                                    color={props.style.color} />

                            </div>
                            }
                            {game.odds?.spread && spreadDisplay(game)}
                            {/* {game?.startDate && <div> {new Date(game?.startDate).toLocaleDateString('en-us')}</div>}
                            {game.startTimeTBD ? <div>TBD</div> :
                                <div>{new Date(game?.startDate).toLocaleTimeString('en-us', { timeStyle: "short" })}</div>} */}
                        </Col>

                    </Row>

                </Card.Body>
            </Card>
        </Col>
        )}
    </Row>
</>


export default standingsTable;