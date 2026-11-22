// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type InStatement } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { migrate, openDatabase, resolveDatabaseUrl, type Database } from "./db";

describe("couche données · db (adresse de la base)", () => {
  it("utilise DATABASE_URL quand elle est remplie", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "libsql://pipeline.turso.io", VERCEL_ENV: "production" })).toBe(
      "libsql://pipeline.turso.io",
    );
  });

  it("retombe sur la base locale hors Vercel quand DATABASE_URL est vide ou absente", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "" })).toBe("file:.data/pipeline.db");
    expect(resolveDatabaseUrl({})).toBe("file:.data/pipeline.db");
  });

  it("refuse de démarrer sur un déploiement Vercel (production ou preview) sans DATABASE_URL", () => {
    expect(() => resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(() => resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  // #31 : `vercel env pull` peut écrire VERCEL=1 dans .env.local ; en local, la base locale reste utilisée.
  it("garde la base locale en développement, même avec VERCEL=1 venu de `vercel env pull`", () => {
    expect(resolveDatabaseUrl({ VERCEL: "1", VERCEL_ENV: "development" })).toBe("file:.data/pipeline.db");
    expect(resolveDatabaseUrl({ VERCEL: "1" })).toBe("file:.data/pipeline.db");
  });
});

describe("couche données · db (migrations)", () => {
  const opened: Database[] = [];
  const tempDirs: string[] = [];

  const tempUrl = () => {
    const dir = mkdtempSync(join(tmpdir(), "pipeline-"));
    tempDirs.push(dir);
    return `file:${join(dir, "pipeline.db")}`;
  };

  const open = async (url: string) => {
    const db = openDatabase(url);
    opened.push(db);
    await db.ready;
    return db;
  };

  const appliedVersion = async (db: Database) => {
    const { rows } = await db.client.execute("SELECT MAX(version) AS v FROM schema_migrations");
    return Number(rows[0].v);
  };

  afterEach(() => {
    opened.splice(0).forEach((db) => db.client.close());
    tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  it("note les migrations appliquées dans schema_migrations, sans écrire PRAGMA user_version", async () => {
    const db = await open(":memory:");

    expect(await appliedVersion(db)).toBe(4);
    const { rows } = await db.client.execute("PRAGMA user_version");
    expect(Number(rows[0].user_version)).toBe(0);
  });

  it("reprend une base déjà migrée avec l'ancien compteur sans rejouer ses migrations", async () => {
    const url = tempUrl();
    const ancienne = createClient({ url });
    await ancienne.batch(
      [
        "CREATE TABLE contacts (id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, created_at TEXT NOT NULL)",
        "ALTER TABLE contacts ADD COLUMN stage TEXT NOT NULL DEFAULT 'nouveau'",
        "ALTER TABLE contacts ADD COLUMN follow_up_on TEXT",
        "ALTER TABLE contacts ADD COLUMN follow_up_done INTEGER NOT NULL DEFAULT 0",
        "PRAGMA user_version = 4",
        "INSERT INTO contacts (id, name, created_at) VALUES ('1', 'Claire Martin', '2026-11-20T10:00:00.000Z')",
      ],
      "write",
    );
    ancienne.close();

    const db = await open(url);

    expect(await appliedVersion(db)).toBe(4);
    const { rows } = await db.client.execute("SELECT name FROM contacts");
    expect(rows.map((r) => r.name)).toEqual(["Claire Martin"]);
  });

  it("ne rejoue rien à la réouverture d'une base migrée", async () => {
    const url = tempUrl();
    (await open(url)).client.close();

    const db = await open(url);

    const { rows } = await db.client.execute("SELECT COUNT(*) AS n FROM schema_migrations");
    expect(Number(rows[0].n)).toBe(4);
  });

  // #34 : deux serveurs démarrent ensemble. Le second a lu « rien d'appliqué » juste avant que le premier
  // applique les migrations : il ne doit ni planter ni noter deux fois les mêmes versions.
  it("tolère une migration appliquée entre-temps par un autre serveur", async () => {
    const db = await open(tempUrl());
    let staleReads = 1;
    const lateServer = new Proxy(db.client, {
      get(target, key, receiver) {
        if (key !== "execute") {
          const value = Reflect.get(target, key, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (statement: InStatement) => {
          const sql = typeof statement === "string" ? statement : statement.sql;
          if (staleReads > 0 && sql.startsWith("SELECT MAX(version)")) {
            staleReads--;
            return { rows: [{ v: null }] };
          }
          if (sql.startsWith("PRAGMA user_version")) return { rows: [{ user_version: 0 }] };
          return target.execute(statement);
        };
      },
    });

    await expect(migrate(lateServer)).resolves.toBeUndefined();

    expect(await appliedVersion(db)).toBe(4);
    const { rows } = await db.client.execute("SELECT version, COUNT(*) AS n FROM schema_migrations GROUP BY version HAVING n > 1");
    expect(rows).toEqual([]);
  });
});
