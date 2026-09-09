import { useEffect, useState } from 'react';
import { Nav, Container, Navbar, NavDropdown } from 'react-bootstrap';
import SeasonSelect from './selects/SeasonSelect';

import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalState } from "../App";


function CfbNav(props) {

    const navigate = useNavigate();
    const location = useLocation();
    const [favorites, setFavorites] = useState([]);
    const { globalState, setGlobalState } = useGlobalState();
    const [season, setSeason] = useState(globalState.season);

    useEffect(() => {
        const favorites = JSON.parse(localStorage.getItem("favorites"));
        if (favorites && favorites.length > 0) {
            setFavorites(favorites)
        }

    }, [favorites])

    useEffect(() => {
        localStorage.setItem("favorites", JSON.stringify(favorites))
    }, [favorites]);

    // Use useEffect to handle state changes and update the URL
    useEffect(() => {
        const queryParams = new URLSearchParams(location.season);
        queryParams.set('season', season);
        console.log({ queryParams, location, params: queryParams.toString() });

        // Replace the current state in the history without adding a new entry
        localStorage.setItem('current_season', season.toString());
        setGlobalState((prevState) => ({
            ...prevState,
            season
        }));
        navigate({ pathname: location.pathname, search: queryParams.toString(), replace: true });
        // If you want to push a new entry to the history, use history.push instead
        // history.push({ season: queryParams.toString() });

    }, [season]);

    const handleSeasonChange = (e) => {

        setSeason(e.target.value);
    }


    return (
        <Navbar bg="light" expand="lg">
            <Container>
                <Navbar.Brand href="/">College Football Stats</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link href="/">Home</Nav.Link>
                        <NavDropdown title="Favorites" id="cfb-favorites">
                            {favorites && favorites.length > 0 ? favorites.map(({ name, id }) => <NavDropdown.Item
                                href={`/team/${id}`} key={id}>
                                {name}
                            </NavDropdown.Item>) : <NavDropdown.Item href="#">No Favorites Yet</NavDropdown.Item>}
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
                <Navbar.Collapse className="justify-content-end">
                    <SeasonSelect handleChange={handleSeasonChange} value={season} />
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default CfbNav;