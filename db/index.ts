import type { TripDocument } from "@/lib/trip-types";
import type { PublishedGuide } from "@/lib/guide-types";

type D1Result<T> = { results?: T[] };

type Database = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<D1Result<T>>;
      run(): Promise<unknown>;
    };
    all<T>(): Promise<D1Result<T>>;
    run(): Promise<unknown>;
  };
  batch(statements: unknown[]): Promise<unknown>;
};

const createTable = `CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  summary TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const createIndex = "CREATE INDEX IF NOT EXISTS trips_owner_updated_idx ON trips (owner_id, updated_at)";

const createGuidesTable = `CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  author TEXT NOT NULL,
  summary TEXT NOT NULL,
  data_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const createGuidesIndex = "CREATE INDEX IF NOT EXISTS guides_published_idx ON guides (published_at)";

export async function ensureSchema(db: Database) {
  await db.batch([db.prepare(createTable), db.prepare(createIndex), db.prepare(createGuidesTable), db.prepare(createGuidesIndex)]);
}

export async function listTrips(db: Database, owner: string) {
  await ensureSchema(db);
  const result = await db
    .prepare("SELECT data_json FROM trips WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 50")
    .bind(owner)
    .all<{ data_json: string }>();

  return (result.results ?? []).flatMap((row) => {
    try {
      return [JSON.parse(row.data_json) as TripDocument];
    } catch {
      return [];
    }
  });
}

export async function saveTrip(db: Database, owner: string, trip: TripDocument) {
  await ensureSchema(db);
  const now = new Date().toISOString();
  const document = { ...trip, updatedAt: now };
  await db
    .prepare(`INSERT INTO trips (id, owner_id, title, destination, summary, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        destination = excluded.destination,
        summary = excluded.summary,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
      WHERE owner_id = excluded.owner_id`)
    .bind(
      document.id,
      owner,
      document.title,
      document.destination,
      document.recommendations[document.decision.status].title,
      JSON.stringify(document),
      now,
      now,
    )
    .run();
  return document;
}

export async function removeTrip(db: Database, owner: string, id: string) {
  await ensureSchema(db);
  await db.prepare("DELETE FROM trips WHERE owner_id = ? AND id = ?").bind(owner, id).run();
}

function parseGuides(rows: { data_json: string }[]) {
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.data_json) as PublishedGuide];
    } catch {
      return [];
    }
  });
}

export async function listGuides(db: Database) {
  await ensureSchema(db);
  const result = await db
    .prepare("SELECT data_json FROM guides ORDER BY published_at DESC LIMIT 36")
    .all<{ data_json: string }>();
  return parseGuides(result.results ?? []);
}

export async function getGuide(db: Database, id: string) {
  await ensureSchema(db);
  const result = await db
    .prepare("SELECT data_json FROM guides WHERE id = ? LIMIT 1")
    .bind(id)
    .all<{ data_json: string }>();
  return parseGuides(result.results ?? [])[0] ?? null;
}

export async function saveGuide(db: Database, owner: string, guide: PublishedGuide) {
  await ensureSchema(db);
  const now = new Date().toISOString();
  const document = { ...guide, publishedAt: guide.publishedAt || now };
  await db
    .prepare(`INSERT INTO guides (id, owner_id, title, destination, author, summary, data_json, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        destination = excluded.destination,
        author = excluded.author,
        summary = excluded.summary,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
      WHERE owner_id = excluded.owner_id`)
    .bind(document.id, owner, document.title, document.destination, document.author, document.summary, JSON.stringify(document), document.publishedAt, now)
    .run();
  return document;
}
