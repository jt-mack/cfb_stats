import dotenv from 'dotenv';
import { client } from 'cfbd';

dotenv.config();

const apiKey = process.env.CFBDATA_APIKEY;

if (apiKey) {
  client.setConfig({
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export { client };

/**
 * Default season: current year, or previous year if before August.
 */
export function getDefaultSeason(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return month <= 2 ? year - 1 : year;
}

/**
 * Unwrap CFBD SDK response: return data or throw.
 */
export async function unwrap<T>(promise: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const result = await promise;
  if (result.error) {
    throw result.error;
  }
  if (result.data === undefined) {
    throw new Error('No data in CFBD response');
  }
  return result.data;
}
