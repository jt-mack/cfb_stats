import React, {createContext, useState, useContext, useEffect} from 'react';
import {Routes, Route, useLocation, useNavigate} from "react-router-dom";
import Container from 'react-bootstrap/Container';
import CfbNav from './components/Navbar';
import AllTeams from './views/AllTeams';
import Team from './views/Team';


import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Create a context
const GlobalStateContext = createContext<any>({conferences:[],season:2025});


// Create a custom hook for easy access
export const useGlobalState = () => useContext(GlobalStateContext);
export const GlobalStateProvider =  ({children}:{children:any}) => {

    let currentDate=new Date();
    let currentMonth=currentDate.getMonth();
    let currentYear=currentDate.getFullYear();
    if(currentMonth <=7){
        currentYear=currentYear-1;
    }
    

    const [globalState, setGlobalState] = useState({
        // Your global state here
        conferences:localStorage.getItem('conferences') ? JSON.parse(localStorage.getItem('conferences') ?? '') : [],
        season:localStorage.getItem('selected_season') ?? currentYear.toString(),
    });

    async function getNcaaConferences() {
        const response = await fetch(`/api/cfb/conferences?season=${globalState.season}`);
        const conferences = await response.json();

        if (response.status !== 200) {
            throw Error(conferences)
        }
        localStorage.setItem('conferences', JSON.stringify(conferences));
        return setGlobalState((prevState)=>({
            ...prevState,
            conferences
        }));
    }
    if(globalState.conferences.length===0){
        getNcaaConferences();
    }

    return (
        <GlobalStateContext.Provider value={{globalState, setGlobalState}}>
            {children}
        </GlobalStateContext.Provider>
    );
};

function App() {

    return (
        <div className="App">
            <GlobalStateProvider>
                <CfbNav/>
                <Container fluid className={"bg-dark text-light"}>
                    <Routes>
                        <Route path="" element={<AllTeams/>}/>
                        <Route path="/team/:team_id" element={<Team/>}/>
                    </Routes>


                </Container>
            </GlobalStateProvider>
        </div>
    );
}

export default App;