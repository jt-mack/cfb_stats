import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import './lib/cfbd-client'; // ensure CFBD client is configured with API key
import cfbRoutes from './routes';

const port = process.env.SERVER_PORT || 5000;
const app = express();

dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CFB API: single base path; all sub-routes are mounted from routes/index
app.use('/api/cfb', cfbRoutes);

// Production: proxy frontend requests to Next.js (running on 3000 via start:prod)
if (process.env.NODE_ENV === 'production') {
  app.use(
    createProxyMiddleware({
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
      ws: true,
    })
  );
}

app.listen(port, () => console.log(`Listening on port ${port}`));



