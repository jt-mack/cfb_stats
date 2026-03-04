import { Router } from 'express';
import fbsRoutes from './fbs-routes';
import conferencesRoutes from './conferences-routes';
import teamsRoutes from './teams-routes';
import gamesRoutes from './games-routes';

/**
 * Routes index: mount all CFB API route modules. The /api/cfb prefix is
 * applied once when this router is mounted in server.ts.
 */
const router = Router();

router.use(fbsRoutes);
router.use(conferencesRoutes);
router.use(teamsRoutes);
router.use(gamesRoutes);

export default router;
