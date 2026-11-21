// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createContactRepository } from "./contact.repository";

const claire = {
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: "06 12 34 56 78",
  stage: "nouveau",
};

describe("couche données · contact.repository", () => {
  const opened: Database[] = [];
  const tempDirs: string[] = [];
  const open = (url: string) => {
    const db = openDatabase(url);
    opened.push(db);
    return db;
  };

  afterEach(() => {
    opened.splice(0).forEach((db) => db.client.close());
    tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  it("enregistre un contact et le renvoie avec un id et une date de création", async () => {
    const repository = createContactRepository(open(":memory:"));

    const saved = await repository.insert(claire);

    expect(saved).toMatchObject(claire);
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(await repository.findAll()).toEqual([saved]);
  });

  it("liste les contacts du plus récent au plus ancien", async () => {
    const repository = createContactRepository(open(":memory:"));

    await repository.insert({ ...claire, name: "Premier" });
    await repository.insert({ ...claire, name: "Second" });

    expect((await repository.findAll()).map((c) => c.name)).toEqual(["Second", "Premier"]);
  });

  it("garde les champs facultatifs vides", async () => {
    const repository = createContactRepository(open(":memory:"));

    const saved = await repository.insert({ name: "Sans détails", company: null, email: null, phone: null, stage: "nouveau" });

    expect(saved).toMatchObject({ company: null, email: null, phone: null });
  });

  // Critère 4 : après redémarrage de l'app, les contacts sont toujours là.
  it("retrouve les contacts après un redémarrage (nouvelle connexion au même fichier)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pipeline-"));
    tempDirs.push(dir);
    const url = `file:${join(dir, "pipeline.db")}`;

    const avant = open(url);
    await createContactRepository(avant).insert(claire);
    avant.client.close();

    const apres = createContactRepository(open(url));
    expect(await apres.findAll()).toEqual([expect.objectContaining(claire)]);
  });

  // Lot 2 · Critère 2 : l'étape est enregistrée et relue telle quelle, sans décision ici.
  it("enregistre l'étape reçue et la renvoie", async () => {
    const repository = createContactRepository(open(":memory:"));

    const saved = await repository.insert({ ...claire, stage: "rdv" });

    expect(saved.stage).toBe("rdv");
    expect(await repository.findAll()).toEqual([expect.objectContaining({ stage: "rdv" })]);
  });

  // Lot 2 · Critère 2 : les contacts du lot 1 (base sans étape) arrivent dans Nouveau après migration.
  it("range dans « nouveau » les contacts d'une base créée avant les étapes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pipeline-"));
    tempDirs.push(dir);
    const url = `file:${join(dir, "pipeline.db")}`;

    const ancienne = createClient({ url });
    await ancienne.batch(
      [
        "CREATE TABLE contacts (id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, created_at TEXT NOT NULL)",
        "PRAGMA user_version = 1",
        "INSERT INTO contacts (id, name, created_at) VALUES ('1', 'Claire Martin', '2026-11-20T10:00:00.000Z')",
      ],
      "write",
    );
    ancienne.close();

    const repository = createContactRepository(open(url));
    expect(await repository.findAll()).toEqual([expect.objectContaining({ name: "Claire Martin", stage: "nouveau" })]);
  });

  // Lot 3 · Critères 1 à 3 : l'étape enregistrée change, sans décision ici.
  it("change l'étape d'un contact et le renvoie", async () => {
    const repository = createContactRepository(open(":memory:"));
    const saved = await repository.insert(claire);

    const moved = await repository.updateStage(saved.id, "rdv");

    expect(moved).toEqual({ ...saved, stage: "rdv" });
    expect(await repository.findById(saved.id)).toEqual({ ...saved, stage: "rdv" });
  });

  it("renvoie null pour un contact inconnu", async () => {
    const repository = createContactRepository(open(":memory:"));

    expect(await repository.findById("inconnu")).toBeNull();
    expect(await repository.updateStage("inconnu", "rdv")).toBeNull();
  });

  // Lot 3 · Critère 5 : un contact déplacé est toujours dans sa nouvelle colonne après redémarrage.
  it("garde la nouvelle étape après un redémarrage", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pipeline-"));
    tempDirs.push(dir);
    const url = `file:${join(dir, "pipeline.db")}`;

    const avant = open(url);
    const saved = await createContactRepository(avant).insert(claire);
    await createContactRepository(avant).updateStage(saved.id, "proposition");
    avant.client.close();

    expect(await createContactRepository(open(url)).findById(saved.id)).toMatchObject({ stage: "proposition" });
  });

  // Lot 4 · Critère 1 : la date de relance est enregistrée et relue.
  it("enregistre la date de relance, absente par défaut", async () => {
    const repository = createContactRepository(open(":memory:"));
    const saved = await repository.insert(claire);
    expect(saved.followUpOn).toBeNull();

    const updated = await repository.setFollowUp(saved.id, "2026-11-21");

    expect(updated).toEqual({ ...saved, followUpOn: "2026-11-21" });
    expect(await repository.findAll()).toEqual([{ ...saved, followUpOn: "2026-11-21" }]);
    expect(await repository.setFollowUp("inconnu", "2026-11-21")).toBeNull();
  });
});

