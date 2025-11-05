import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Image, ListGroup, ButtonGroup, ToggleButton, Form, Dropdown } from "react-bootstrap";
import { BsSortNumericDown, BsSortAlphaDown } from 'react-icons/bs';


const RosterList = ({ players = [] }) => {
    return (
        <Row xs={1} md={2} lg={3} className="g-3 text-dark">
            {players.map((player) => {
                const playerCardLink = player.links?.find((l) =>
                    l.rel?.includes("playercard")
                )?.href;

                return (
                    <Col key={player.id}>
                        <Card className="h-100 shadow-sm">
                            <Card.Body className="d-flex justify-content-between">
                                <div className="d-flex">
                                    <Image
                                        src={player.headshot?.href}
                                        alt={player.headshot?.alt || player.fullName}
                                        rounded
                                        style={{ width: "75px", height: "75px", objectFit: "cover" }}
                                        className="me-3"
                                    />

                                    <div>
                                        <Card.Title className="mb-0">
                                            {player.fullName}
                                        </Card.Title>
                                        <Card.Subtitle className="text-muted mb-2">
                                            #{player.jersey} • {player.position?.abbreviation}
                                        </Card.Subtitle>

                                        <ListGroup variant="flush" className="small">
                                            <ListGroup.Item className="p-0 border-0">
                                                {player.displayHeight} • {player.displayWeight}
                                            </ListGroup.Item>
                                            <ListGroup.Item className="p-0 border-0">
                                                {player.experience?.displayValue || ""}
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </div>
                                </div>
                                <Dropdown className="justify-self-end">
                                    <Dropdown.Toggle variant={"outline-secondary"} >
                                        Player Links
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                        {player?.links?.map((link, index) =>
                                            <Dropdown.Item href={link.href} key={index}
                                                target={"_blank"}>{link.text}</Dropdown.Item>
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Card.Body>

                            {playerCardLink && (
                                <Card.Footer className="text-center">
                                    <a href={playerCardLink} target="_blank" rel="noopener noreferrer">
                                        View Player Profile
                                    </a>
                                </Card.Footer>
                            )}
                        </Card>
                    </Col>
                );
            })}
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
                if (p.position?.abbreviation) unique.add(p.position.abbreviation);
            });
            return Array.from(unique).sort();
        }
        return [];
    }, [roster]);

    const sortedAndFilteredRoster = useMemo(() => {
        if (roster && roster.length > 0) {

            let result = [...roster];
            if (positionFilter != "all") {
                result = result.filter(p => p.position?.abbreviation === positionFilter)
            }
            if (sortMode === "number") {
                result.sort((a, b) => (parseInt(a.jersey) || 0) - (parseInt(b.jersey) || 0));
            } else {
                result.sort((a, b) => a.fullName.localeCompare(b.fullName));
            }
            return result;
        }
    }, [roster, sortMode, positionFilter]);


    const getRoster = async (id) => {
        const result = await fetch(`/api/cfb/team/${id}/players`)
        const roster = await result.json();
        return roster
    }

    useEffect(() => {
        if (id) {
            getRoster(id).then(roster => setRoster(roster))
        }
    }, [id])

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