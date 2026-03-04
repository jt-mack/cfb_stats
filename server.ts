import express from 'express';
import dotenv from 'dotenv';
import './lib/cfbd-client'; // ensure CFBD client is configured with API key
import cfbRoutes from './routes';

const port = process.env.PORT || 5000;
const app = express();

dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CFB API: single base path; all sub-routes are mounted from routes/index
app.use('/api/cfb', cfbRoutes);

// Frontend is served by Next.js: dev = "npm run client" (next dev), prod = "next start" in client-next.
// API is the only responsibility of this server.

app.listen(port, () => console.log(`Listening on port ${port}`));



