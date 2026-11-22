// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, type Database } from "./db";
import { createRateLimitRepository } from "./rate-limit.repository";

// #32 : les compteurs d'appels par clé et par fenêtre de temps, gardés en base (partagés entre serveurs).
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

  it("compte un appel pour plusieurs clés d'un coup, et renvoie les totaux à jour", async () => {
    const repository = createRateLimitRepository(open());

    expect(await repository.hit(["write:1.2.3.4", "write:*"], 60_000)).toEqual([1, 1]);
    expect(await repository.hit(["write:1.2.3.4", "write:*"], 60_000)).toEqual([2, 2]);
    expect(await repository.hit(["write:5.6.7.8", "write:*"], 60_000)).toEqual([1, 3]);
  });

  it("lit les compteurs sans rien écrire, zéro pour une clé jamais vue", async () => {
    const repository = createRateLimitRepository(open());
    await repository.hit(["write:1.2.3.4"], 60_000);

    expect(await repository.count(["write:1.2.3.4", "write:9.9.9.9"], 60_000)).toEqual([1, 0]);
    expect(await repository.count(["write:1.2.3.4"], 120_000)).toEqual([0]);
  });

  it("efface les fenêtres plus anciennes que la date donnée, et elles seules", async () => {
    const db = open();
    const repository = createRateLimitRepository(db);
    await repository.hit(["write:1.2.3.4"], 0);
    await repository.hit(["write:1.2.3.4"], 60_000);
    await repository.hit(["write:1.2.3.4"], 120_000);

    await repository.purgeBefore(60_000);

    const { rows } = await db.client.execute("SELECT window_start FROM rate_limits ORDER BY window_start");
    expect(rows.map((row) => Number(row.window_start))).toEqual([60_000, 120_000]);
  });
});
