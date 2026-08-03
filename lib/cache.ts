import NodeCache from 'node-cache';

/**
 * Shared HTTP route cache for assembled JSON responses (via cachedJson / route handlers).
 * Raw ESPN payloads belong in lib/sdv/client.ts responseCache — do not double-store raw there here.
 */
export const routeCache = new NodeCache({ stdTTL: 3600, useClones: false });
