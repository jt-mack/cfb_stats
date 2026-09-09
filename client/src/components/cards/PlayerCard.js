import { Row, Col, Card, ListGroup, Stack } from 'react-bootstrap';


const placeholderPic = "//ttwo.dk/wp-content/uploads/2017/08/person-placeholder.jpg";

function PlayerCard(props) {
    let { player, stats } = props;
    let { fullName = "", headshot, jersey, position, team } = player;
    let { stat_type, stat } = stats;
    const imgSrc = headshot?.href || placeholderPic;
    const imgText = headshot?.alt;
    return (
        <Card style={{
            // width: '18rem' 
        }}>
            <Card.Header className={"p-1"}>
                <Stack direction={"horizontal"} >
                    <img src={team.logo} className={"table-image m-0 p-0"} />
                    <span className={"text-dark fw-bold ms-auto"}>#{jersey} ({position.abbreviation})</span>
                </Stack>

            </Card.Header>
            <Card.Img variant="top" src={imgSrc} alt={imgText} />
            <Card.Body className="text-dark text-center p-0">
                <p>{fullName}</p>
            </Card.Body>
            <ListGroup className="list-group-flush text-center">
                <ListGroup.Item className="fw-bold">{stat_type}</ListGroup.Item>
                <ListGroup.Item className={'small'}>{stat}</ListGroup.Item>
            </ListGroup>
        </Card>
    );
}

export default PlayerCard;