// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createRateLimitRepository } from "./rate-limit.repository";

// #32 : le compteur d'appels par clé et par fenêtre de temps, gardé en base (partagé entre serveurs).
describe("couche données · rate-limit.repository", () => {
  const opened: Database[] = [];
  const open = () => {
    const db = openDatabase(":memory:");
    opened.push(db);
    return db;
  };

  afterEach(() => {
    opened.splice(0).forEach((db) => db.client.close());
  });

  it("compte les appels d'une clé dans une fenêtre, et renvoie le total à jour", async () => {
    const repository = createRateLimitRepository(open());

    expect(await repository.hit("write:1.2.3.4", 60_000)).toBe(1);
    expect(await repository.hit("write:1.2.3.4", 60_000)).toBe(2);
    expect(await repository.hit("write:5.6.7.8", 60_000)).toBe(1);
  });

  it("repart de zéro dans une nouvelle fenêtre et efface les fenêtres passées", async () => {
    const db = open();
    const repository = createRateLimitRepository(db);
    await repository.hit("write:1.2.3.4", 60_000);
    await repository.hit("write:1.2.3.4", 60_000);

    expect(await repository.hit("write:1.2.3.4", 120_000)).toBe(1);
    const { rows } = await db.client.execute("SELECT COUNT(*) AS n FROM rate_limits WHERE window_start < 120000");
    expect(Number(rows[0].n)).toBe(0);
  });
});
