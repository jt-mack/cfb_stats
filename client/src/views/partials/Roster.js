import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, ListGroup, ButtonGroup, ToggleButton, Form } from "react-bootstrap";
import { BsSortNumericDown, BsSortAlphaDown } from 'react-icons/bs';
import { getRoster } from '../../repos/teamsRepo';


// CFBD RosterPlayer: id, firstName, lastName, team, height, weight, jersey, year, position (string)
const fullName = (p) => [p.firstName, p.lastName].filter(Boolean).join(' ') || p.id;

const RosterList = ({ players = [] }) => {
    return (
        <Row xs={1} md={2} lg={3} className="g-3 text-dark">
            {players.map((player) => (
                <Col key={player.id}>
                    <Card className="h-100 shadow-sm">
                        <Card.Body className="d-flex justify-content-between">
                            <div className="d-flex">
                                <div
                                    className="me-3 rounded bg-secondary d-flex align-items-center justify-content-center text-white"
                                    style={{ width: 75, height: 75 }}
                                >
                                    #{player.jersey ?? '—'}
                                </div>
                                <div>
                                    <Card.Title className="mb-0">
                                        {fullName(player)}
                                    </Card.Title>
                                    <Card.Subtitle className="text-muted mb-2">
                                        #{player.jersey ?? '—'} • {player.position ?? '—'}
                                    </Card.Subtitle>
                                    <ListGroup variant="flush" className="small">
                                        <ListGroup.Item className="p-0 border-0">
                                            {player.height != null ? `${player.height}"` : '—'} • {player.weight != null ? `${player.weight} lbs` : '—'}
                                        </ListGroup.Item>
                                        <ListGroup.Item className="p-0 border-0">
                                            {player.year != null ? `Year: ${player.year}` : ''}
                                        </ListGroup.Item>
                                    </ListGroup>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};


const Roster = (props) => {
    const { id } = props
    const [roster, setRoster] = useState([])

    const [positionFilter, setPositionFilter] = useState("all");
    const [sortMode, setSortMode] = useState("number"); // "number" or "name"

    const positionOptions = useMemo(() => {
        if (roster.length > 0) {
            const unique = new Set();
            roster.forEach((p) => {
                if (p.position) unique.add(p.position);
            });
            return Array.from(unique).sort();
        }
        return [];
    }, [roster]);

    const sortedAndFilteredRoster = useMemo(() => {
        if (!roster || roster.length === 0) return [];
        let result = [...roster];
        if (positionFilter !== "all") {
            result = result.filter((p) => p.position === positionFilter);
        }
        if (sortMode === "number") {
            result.sort((a, b) => (Number(a.jersey) || 0) - (Number(b.jersey) || 0));
        } else {
            result.sort((a, b) => fullName(a).localeCompare(fullName(b)));
        }
        return result;
    }, [roster, sortMode, positionFilter]);

    useEffect(() => {
        if (!id) return;
        const season = props.season ? Number(props.season) : undefined;
        getRoster(id, season).then(setRoster).catch(() => setRoster([]));
    }, [id, props.season]);

    return (
        <div>
            {/* Sorting Controls */}
            <div className="d-flex gap-2 align-items-center mb-3">
                <ButtonGroup size="sm">
                    <ToggleButton
                        id="sort-number"
                        type="radio"
                        variant={sortMode === "number" ? "outline-primary" : "outline-dark"}

                        onChange={() => setSortMode("number")}
                        value="number"
                    >
                        <BsSortNumericDown /> Number
                    </ToggleButton>

                    <ToggleButton
                        id="sort-name"
                        type="radio"
                        variant={sortMode === "name" ? "outline-primary" : "outline-dark"}

                        onChange={() => setSortMode("name")}
                        value="name"
                    >
                        <BsSortAlphaDown /> Name
                    </ToggleButton>
                </ButtonGroup>
                <Form.Select
                    size="sm"
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    style={{ width: "180px" }}
                >
                    <option value="all">All Positions</option>
                    {positionOptions.map((pos) => (
                        <option key={pos} value={pos}>
                            {pos}
                        </option>
                    ))}
                </Form.Select>
            </div>
            {roster && roster.length > 0 && <RosterList players={sortedAndFilteredRoster} />}
        </div>
    )
}

export default Roster;