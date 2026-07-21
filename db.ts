/**
 * Production data layer — SQLite (Node.js built-in node:sqlite, WAL mode).
 * Replaces the old site_data_store.json flat-file "database".
 * - Atomic, corruption-safe writes (WAL + transactions)
 * - Zero native dependencies (works on Windows, Linux, Docker without node-gyp)
 * - One-time safe migration from site_data_store.json
 * - Built-in backup support (VACUUM INTO)
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "ilhomdent.db");
const LEGACY_JSON_PATH = path.join(process.cwd(), "site_data_store.json");

// Known demo/seed record ids shipped with the original template — never real patient data.
const SEED_IDS = new Set(["apt-1", "apt-2", "apt-3", "rev-1", "rev-2"]);
// Known compromised default password from the original template.
const COMPROMISED_DEFAULT_PASSWORD = "drilhom2026";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    lastUpdated TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(createdAt);
  CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(lastUpdated);
`);

type CollectionName = "appointments" | "reviews" | "chats";

function inTransaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* noop */
    }
    throw err;
  }
}

// ---------- KV (config) ----------
export function kvGet<T = any>(key: string, fallback: T | null = null): T | null {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function kvSet(key: string, value: any): void {
  db.prepare(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, JSON.stringify(value));
}

export function kvSetMany(entries: Array<[string, any]>): void {
  inTransaction(() => {
    for (const [k, v] of entries) kvSet(k, v);
  });
}

// ---------- Collections ----------
const ORDER_SQL: Record<string, string> = {
  "rowid DESC": "rowid DESC",
  "createdAt DESC": "createdAt DESC",
  "lastUpdated DESC": "lastUpdated DESC",
};

export function listCollection<T = any>(name: CollectionName, orderBy = "rowid DESC"): T[] {
  const order = ORDER_SQL[orderBy] || "rowid DESC";
  const rows = db.prepare(`SELECT data FROM ${name} ORDER BY ${order}`).all() as unknown as Array<{
    data: string;
  }>;
  return rows.map((r) => JSON.parse(r.data));
}

export function upsertRow(name: CollectionName, id: string, obj: any, sortValue?: string): void {
  const col = name === "chats" ? "lastUpdated" : "createdAt";
  db.prepare(
    `INSERT INTO ${name} (id, data, ${col}) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, ${col} = excluded.${col}`
  ).run(id, JSON.stringify(obj), sortValue || new Date().toISOString());
}

export function deleteRow(name: CollectionName, id: string): void {
  db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id);
}

export function getRow<T = any>(name: CollectionName, id: string): T | null {
  const row = db.prepare(`SELECT data FROM ${name} WHERE id = ?`).get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as T) : null;
}

export function countRows(name: CollectionName): number {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get() as unknown as { c: number };
  return row.c;
}

/** Prune oldest chat sessions beyond a cap so the table cannot grow unbounded. */
export function pruneChats(keep = 500): number {
  const before = countRows("chats");
  db.prepare(
    `DELETE FROM chats WHERE id IN (
       SELECT id FROM chats ORDER BY lastUpdated DESC LIMIT -1 OFFSET ?
     )`
  ).run(keep);
  return before - countRows("chats");
}

// ---------- Migration from legacy JSON store ----------
export interface MigrationResult {
  migrated: boolean;
  discardedCompromisedPassword: boolean;
  importedAppointments: number;
  importedReviews: number;
  importedChats: number;
}

/**
 * Imports the legacy site_data_store.json exactly once (only when not yet migrated),
 * skipping known demo seed rows and the known-compromised default password.
 * The legacy file is renamed to *.imported.bak afterwards so secrets do not linger.
 */
export function migrateLegacyJsonIfNeeded(
  hashPassword: (plain: string) => string
): MigrationResult {
  const result: MigrationResult = {
    migrated: false,
    discardedCompromisedPassword: false,
    importedAppointments: 0,
    importedReviews: 0,
    importedChats: 0,
  };

  const alreadyMigrated = kvGet<boolean>("migration:legacy_json_done", false);
  if (alreadyMigrated || !fs.existsSync(LEGACY_JSON_PATH)) return result;

  let legacy: any;
  try {
    legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, "utf-8"));
  } catch {
    kvSet("migration:legacy_json_done", true);
    return result;
  }

  inTransaction(() => {
    // Config keys
    const configKeys = [
      "telegram",
      "beforeAfter",
      "contacts",
      "services",
      "doctors",
      "gallery",
      "translations",
      "logo",
    ];
    for (const key of configKeys) {
      if (legacy[key] !== undefined && kvGet(key) === null) {
        kvSet(key, legacy[key]);
      }
    }

    // Auth — hash on import; refuse the known compromised template password.
    if (legacy.auth && legacy.auth.username && legacy.auth.password && kvGet("auth") === null) {
      if (legacy.auth.password === COMPROMISED_DEFAULT_PASSWORD) {
        result.discardedCompromisedPassword = true;
      } else {
        kvSet("auth", {
          isSetup: true,
          username: String(legacy.auth.username),
          passwordHash: hashPassword(String(legacy.auth.password)),
        });
      }
    }

    // Collections — skip template demo rows.
    if (Array.isArray(legacy.appointments)) {
      for (const apt of legacy.appointments) {
        if (!apt?.id || SEED_IDS.has(apt.id)) continue;
        upsertRow("appointments", apt.id, apt, apt.createdAt);
        result.importedAppointments++;
      }
    }
    if (Array.isArray(legacy.reviews)) {
      for (const rev of legacy.reviews) {
        if (!rev?.id || SEED_IDS.has(rev.id)) continue;
        upsertRow("reviews", rev.id, rev);
        result.importedReviews++;
      }
    }
    if (Array.isArray(legacy.chats)) {
      for (const chat of legacy.chats) {
        if (!chat?.id) continue;
        upsertRow("chats", chat.id, chat, chat.lastUpdated);
        result.importedChats++;
      }
    }

    kvSet("migration:legacy_json_done", true);
  });

  // Move the legacy file out of the way (it contained a plaintext password).
  try {
    fs.renameSync(LEGACY_JSON_PATH, LEGACY_JSON_PATH + ".imported.bak");
  } catch {
    /* non-fatal */
  }

  result.migrated = true;
  return result;
}

// ---------- Backup (VACUUM INTO — atomic, consistent snapshot) ----------
export async function backupDb(destPath: string): Promise<void> {
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  // node:sqlite parameterizes only DML; sanitize path for the pragma-style statement.
  const safe = destPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${safe}'`);
}

export function dbHealthy(): boolean {
  try {
    db.prepare("SELECT 1 as ok").get();
    return true;
  } catch {
    return false;
  }
}

export function closeDb(): void {
  try {
    db.close();
  } catch {
    /* noop */
  }
}

export { DB_PATH, DATA_DIR };
