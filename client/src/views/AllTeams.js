import React, {Component, useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Row, Col, Spinner} from 'react-bootstrap';

import { useGlobalState } from "../App";
import CfbDataTable from '../components/CfbDataTable';
import { getTeams } from '../repos/fbsRepo';

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

    // Map CFBD team (with rank) to table row shape
    const mapTeamToRow = (team) => ({
        id: team.id,
        name: team.mascot ? `${team.school} ${team.mascot}` : team.school,
        rank: team.rank ?? 0,
        logo: team.logos?.[0] ?? ''
    });

    const createTableDefinitions = (teamArray) => {
        const table_order = ["id", "name", "rank", "logo"];
        const firstEntry = teamArray[0];
        const cols = table_order.map(col => ({
            dataField: col,
            text: col.toUpperCase(),
            sort: col !== "id" && col !== "logo",
            hidden: col === "id"
        }));
        const rows = teamArray.map(row => {
            const r = { ...row };
            r.rank = r.rank == 0 ? "Not Ranked" : r.rank;
            return r;
        });
        return { cols, rows };
    };

    const listAllNcaaTeams = async () => {
        if (localStorage.getItem(`teams_${globalState.season}`)) {
            const cached = JSON.parse(localStorage.getItem(`teams_${globalState.season}`));
            setTableEntries(createTableDefinitions(cached));
            return setTeams(cached);
        }
        const data = await getTeams(globalState.season ? Number(globalState.season) : undefined);
        const teams = Array.isArray(data) ? data.map(mapTeamToRow) : data;
        setTableEntries(createTableDefinitions(teams));
        localStorage.setItem(`teams_${globalState.season}`, JSON.stringify(teams));
        return setTeams(teams);
    };


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