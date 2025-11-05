import React, {Component, useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Row, Col, Spinner} from 'react-bootstrap';

import {useGlobalState} from "../App";
import CfbDataTable from '../components/CfbDataTable';

const AllTeams = (props) => {

    const [searchParams, setSearchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);

    const {globalState, setGlobalState} = useGlobalState();

    const [teams, setTeams] = useState(localStorage.getItem(`teams_${globalState.season}`) ? JSON.parse(localStorage.getItem(`teams_${globalState.season}`)) : []);
    // const [conferences, setConferences] = useState([]);
    // const [season, setSeason] = useState(null);

    const [tableEntries, setTableEntries] = useState(null);


    const handleTeamTableClick = (e, row, rowIndex) => {
        const row_id = row.id;
        if (row_id) {
            window.location.href = `/team/${row_id}?season=${globalState.season}`;
        }

    }

    const createTableDefinitions = (teamArray) => {
        var table_order = ["id", "name"];
        const firstEntry = teamArray[0];
        var cols = Object.keys(firstEntry)
            .sort((a, b) => table_order.indexOf(a) - table_order.indexOf(b))
            .filter(col => col !== "abbreviation")
            .map(col => {
                return {
                    dataField: col,
                    text: col.toUpperCase(),
                    sort: (col !== "id" && col !== "logo"),
                    hidden: col === "id"
                }
            });
        const rows = teamArray.map((row, i) => {

            row["rank"] = row["rank"] == 0 ? "Not Ranked" : row["rank"];
           
            return row;
        })

        return {
            cols,
            rows
        }

    }

    const listAllNcaaTeams = async () => {
        if (localStorage.getItem(`teams_${globalState.season}`)) {
            setTableEntries(createTableDefinitions(JSON.parse(localStorage.getItem(`teams_${globalState.season}`))));
            return setTeams(JSON.parse(localStorage.getItem(`teams_${globalState.season}`)));
        }
        const response = await fetch(`/api/cfb/teams?season=${globalState.season}`);
        const teams = await response.json();
        if (response.status !== 200) {
            throw Error(teams.message)
        }
        setTableEntries(createTableDefinitions(teams));
        localStorage.setItem(`teams_${globalState.season}`, JSON.stringify(teams));
        return setTeams(teams);
    }


    useEffect(() => {
        if (globalState.season) {
            setLoading(true);
            // getNcaaConferences().then(listAllNcaaTeams).then(() => setLoading(false)).catch(err => console.error(err));
            listAllNcaaTeams().then(() => setLoading(false)).catch(err => console.error(err));

        }
    }, [globalState.season]);


    return (

        <>
            {loading && <Row style={{height: '90vh'}} className='justify-content-center'>
                <Spinner animation="grow" role='status' className='mx-auto'/>
            </Row>}
            {globalState?.season && tableEntries && !loading ? <Row>
                <Col className={"bg-dark text-light text-center"}>
                    <h3>
                        Season: {globalState.season}
                    </h3>
                </Col>
                <Col xs={12}>
                    <CfbDataTable {...tableEntries} handleClick={handleTeamTableClick} className={"top-25"}/>
                </Col>
            </Row> : <></>}
        </>
    );

}


export default AllTeams;