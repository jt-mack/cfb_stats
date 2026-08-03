import NodeCache from 'node-cache';

/** Shared route-level cache — stores objects directly (no JSON round-trip). */
export const routeCache = new NodeCache({ stdTTL: 3600, useClones: false });
