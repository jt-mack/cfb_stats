import fs from 'fs';
import path from 'path';

export type CoachTeamSource = 'season_entry' | 'prior_season';

export type CoachTeamSeason = {
  season: number;
  teamId: number;
  coachId: string;
  firstName: string;
  lastName: string;
  updatedAt: string;
  teamSource: CoachTeamSource;
};

export type CoachEntity = {
  coachId: string;
  firstName: string;
  lastName: string;
  updatedAt: string;
};

export type CoachesDbData = {
  /** Active head coach id per ESPN team id (string keys). */
  currentByTeamId: Record<string, string>;
  /** Season → association rows. */
  bySeason: Record<string, CoachTeamSeason[]>;
  /** Coach id → display names. */
  coaches: Record<string, CoachEntity>;
};

export const EMPTY_COACHES_DB: CoachesDbData = {
  currentByTeamId: {},
  bySeason: {},
  coaches: {},
};

const DB_PATH = path.join(process.cwd(), 'data', 'coaches.json');

type LowDb = {
  data: CoachesDbData;
  read: () => Promise<void>;
  write: () => Promise<void>;
  update: (fn: (data: CoachesDbData) => void) => Promise<void>;
};

let dbPromise: Promise<LowDb> | null = null;

function ensureDataShape(data: CoachesDbData | null | undefined): CoachesDbData {
  return {
    currentByTeamId: data?.currentByTeamId ?? {},
    bySeason: data?.bySeason ?? {},
    coaches: data?.coaches ?? {},
  };
}

export function getCoachesDbPath(): string {
  return DB_PATH;
}

export async function getCoachesDb(): Promise<LowDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      const { JSONFilePreset } = await import('lowdb/node');
      const db = (await JSONFilePreset<CoachesDbData>(DB_PATH, {
        ...EMPTY_COACHES_DB,
      })) as LowDb;
      db.data = ensureDataShape(db.data);
      return db;
    })();
  }
  return dbPromise;
}

export async function readCoachesDb(): Promise<CoachesDbData> {
  const db = await getCoachesDb();
  await db.read();
  db.data = ensureDataShape(db.data);
  return db.data;
}

/** Find association for team+season, else fall back to current coach pointer. */
export async function findCoachAssociation(
  teamId: number,
  season: number
): Promise<{ row: CoachTeamSeason; via: 'season' | 'current' } | null> {
  const data = await readCoachesDb();
  const seasonRows = data.bySeason[String(season)] ?? [];
  const seasonHit = seasonRows.find((r) => r.teamId === teamId);
  if (seasonHit) return { row: seasonHit, via: 'season' };

  const coachId = data.currentByTeamId[String(teamId)];
  if (!coachId) return null;

  const entity = data.coaches[coachId];
  const anyRow =
    Object.values(data.bySeason)
      .flat()
      .find((r) => r.teamId === teamId && r.coachId === coachId) ??
    Object.values(data.bySeason)
      .flat()
      .find((r) => r.coachId === coachId);

  return {
    via: 'current',
    row: {
      season,
      teamId,
      coachId,
      firstName: entity?.firstName ?? anyRow?.firstName ?? '',
      lastName: entity?.lastName ?? anyRow?.lastName ?? '',
      updatedAt: entity?.updatedAt ?? anyRow?.updatedAt ?? new Date().toISOString(),
      teamSource: anyRow?.teamSource ?? 'prior_season',
    },
  };
}

export async function upsertSeasonAssociations(
  season: number,
  rows: CoachTeamSeason[],
  options: { updateCurrent: boolean }
): Promise<void> {
  const db = await getCoachesDb();
  await db.update((data) => {
    const shaped = ensureDataShape(data);
    Object.assign(data, shaped);

    data.bySeason[String(season)] = rows;

    for (const row of rows) {
      data.coaches[row.coachId] = {
        coachId: row.coachId,
        firstName: row.firstName,
        lastName: row.lastName,
        updatedAt: row.updatedAt,
      };
      if (options.updateCurrent) {
        data.currentByTeamId[String(row.teamId)] = row.coachId;
      }
    }
  });
}
