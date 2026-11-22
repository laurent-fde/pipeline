import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

// Seul fichier qui ouvre la base. En local : un fichier SQLite.
// En prod : DATABASE_URL (et DATABASE_AUTH_TOKEN) pointent vers Turso, sans rien changer d'autre.
const LOCAL_DIR = ".data";
const LOCAL_URL = `file:${LOCAL_DIR}/pipeline.db`;

// Migrations numérotées : on n'en modifie jamais une, on en ajoute une à la fin.
// La table schema_migrations retient combien ont déjà été appliquées
// (pas PRAGMA user_version : Turso Cloud refuse de l'écrire).
const migrations = [
  `CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    created_at TEXT NOT NULL
  )`,
  // Lot 2 : l'étape du contact. Les contacts existants arrivent dans « nouveau ».
  `ALTER TABLE contacts ADD COLUMN stage TEXT NOT NULL DEFAULT 'nouveau'`,
  // Lot 4 : la date de relance (AAAA-MM-JJ), absente par défaut.
  `ALTER TABLE contacts ADD COLUMN follow_up_on TEXT`,
  // Lot 5 : la relance a été faite, on attend la réponse (0 ou 1).
  `ALTER TABLE contacts ADD COLUMN follow_up_done INTEGER NOT NULL DEFAULT 0`,
];

async function migrate(client: Client) {
  await client.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER NOT NULL)");
  const { rows } = await client.execute("SELECT MAX(version) AS v FROM schema_migrations");
  let applied = rows[0]?.v == null ? null : Number(rows[0].v);
  if (applied === null) {
    // Base créée avant schema_migrations : on reprend l'ancien compteur (le lire reste permis).
    const legacy = await client.execute("PRAGMA user_version");
    applied = Number(legacy.rows[0]?.user_version ?? 0);
    if (applied > 0) {
      await client.execute({ sql: "INSERT INTO schema_migrations (version) VALUES (?)", args: [applied] });
    }
  }
  for (let version = applied; version < migrations.length; version++) {
    await client.batch(
      [migrations[version], { sql: "INSERT INTO schema_migrations (version) VALUES (?)", args: [version + 1] }],
      "write",
    );
  }
}

export type Database = { client: Client; ready: Promise<void> };

export function openDatabase(url: string, authToken?: string): Database {
  const client = createClient({ url, authToken });
  return { client, ready: migrate(client) };
}

// Une seule connexion pour toute l'app (conservée entre les rechargements de `pnpm dev`).
const globalForDb = globalThis as unknown as { pipelineDb?: Database };

export function getDatabase(): Database {
  if (!globalForDb.pipelineDb) {
    // || et non ?? : une DATABASE_URL vide (copiée de .env.example) retombe sur la base locale.
    const url = process.env.DATABASE_URL || LOCAL_URL;
    if (url === LOCAL_URL) mkdirSync(LOCAL_DIR, { recursive: true });
    globalForDb.pipelineDb = openDatabase(url, process.env.DATABASE_AUTH_TOKEN || undefined);
  }
  return globalForDb.pipelineDb;
}
