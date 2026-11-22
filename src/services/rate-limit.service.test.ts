import { describe, expect, it, vi } from "vitest";
import type { RateLimitRepository } from "@/data/rate-limit.repository";
import { createRateLimitService } from "./rate-limit.service";

// Fausse couche données : un compteur en mémoire par clé et par fenêtre.
function fakeRepository() {
  const counts = new Map<string, number>();
  const repository: RateLimitRepository = {
    hit: vi.fn(async (key: string, windowStart: number) => {
      const id = `${key}@${windowStart}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      return counts.get(id)!;
    }),
  };
  return repository;
}

// #32 : au plus `max` modifications par fenêtre et par clé (adresse IP).
describe("couche service · rate-limit.service (#32)", () => {
  let time = new Date("2026-11-22T10:00:10Z").getTime();
  const now = () => new Date(time);

  it("accepte jusqu'à la limite, puis refuse avec un message", async () => {
    const service = createRateLimitService(fakeRepository(), now, { max: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i++) expect(await service.check("write:1.2.3.4")).toEqual({ ok: true });
    expect(await service.check("write:1.2.3.4")).toEqual({
      ok: false,
      error: "Trop de modifications d'un coup. Attends une minute et réessaie.",
    });
    // Une autre adresse n'est pas concernée.
    expect(await service.check("write:5.6.7.8")).toEqual({ ok: true });
  });

  it("compte par fenêtre alignée sur la minute : la suivante repart de zéro", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, { max: 1, windowMs: 60_000 });

    await service.check("write:1.2.3.4");
    expect(repository.hit).toHaveBeenLastCalledWith("write:1.2.3.4", new Date("2026-11-22T10:00:00Z").getTime());
    expect((await service.check("write:1.2.3.4")).ok).toBe(false);

    time = new Date("2026-11-22T10:01:05Z").getTime();
    expect(await service.check("write:1.2.3.4")).toEqual({ ok: true });
  });

  it("ramène une clé vide ou démesurée à une clé commune, sans la stocker telle quelle", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, { max: 5, windowMs: 60_000 });

    await service.check("");
    await service.check("x".repeat(500));

    expect(repository.hit).toHaveBeenNthCalledWith(1, "inconnu", expect.any(Number));
    expect(repository.hit).toHaveBeenNthCalledWith(2, "inconnu", expect.any(Number));
  });
});
