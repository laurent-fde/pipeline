// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createContactRepository } from "./contact.repository";

const claire = { name: "Claire Martin", company: "Atelier Lumen", email: "claire@lumen.fr", phone: "06 12 34 56 78" };

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

    const saved = await repository.insert({ name: "Sans détails", company: null, email: null, phone: null });

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
});
