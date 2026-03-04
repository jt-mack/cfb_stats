
import express, {Request,Response} from 'express';
import dotenv from 'dotenv';
import path from 'path';
const port = process.env.PORT || 5000;




const app = express();


dotenv.config();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'client/build')));



const collegeFootball = require("./routes/cfb-routes");

import cfbdRouter from './routes/cfbd-routes'

app.use('/api/cfb', collegeFootball);
app.use('/api/cfb/v2',cfbdRouter);


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));

  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Listening on port ${port}`));



