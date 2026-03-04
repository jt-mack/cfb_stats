import {Card, Row, Col, Button, Dropdown, Stack} from 'react-bootstrap';

import {FaHeart} from 'react-icons/fa'

const TeamCard = (props) => {
    let {favorite, makeFavorite, id, links,customStyle} = props;
    return <Card


        className="mb-2 px-0 border-0">
        <Card.Header style={{
            ...customStyle,
        }}>
            <Row className="align-items-center">
                <Stack direction={"horizontal"} gap={3}>
                    <img className="card-image" src={props.logo} alt={props.title}/>

                    <h5 className={"me-auto text-center"}>{props.title} ({typeof props.record === 'string' ? props.record : props.record?.summary ?? "0-0"})</h5>

                    <Dropdown>
                        <Dropdown.Toggle variant={"outline-secondary"} style={{...props.customStyle}}>
                            Team Links
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                            {(links || []).map((link, index) =>
                                <Dropdown.Item href={link.href} key={index}
                                               target={"_blank"}>{link.text}</Dropdown.Item>
                            )}
                        </Dropdown.Menu>
                    </Dropdown>
                    {favorite && favorite["id"] ? <Button variant='light'> <FaHeart className='text-danger'/> </Button> :
                        <Button variant="outline-secondary" className="" onClick={() => makeFavorite(id)}><FaHeart/></Button>}
                </Stack>


            </Row>
        </Card.Header>
        <Card.Body>
            <div className={' d-flex gap-1 justify-content-center align-items-center pb-2'}><img
                className="card-image"
                src={props.conferenceLogo} alt={''}/>
                {/*<span class={'fw-bold'}>{props.standing}</span>*/}
            </div>

            <Row>
                {props.children}
            </Row>

        </Card.Body>
    </Card>
};

export default TeamCard;

