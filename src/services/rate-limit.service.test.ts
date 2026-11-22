import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitRepository } from "@/data/rate-limit.repository";
import { createRateLimitService } from "./rate-limit.service";

const TOO_MANY = { ok: false, error: "Trop de modifications d'un coup. Attends une minute et réessaie." };

// Fausse couche données : des compteurs en mémoire par clé et par fenêtre.
function fakeRepository() {
  const counts = new Map<string, number>();
  const id = (key: string, windowStart: number) => `${key}@${windowStart}`;
  const repository = {
    hit: vi.fn(async (keys: string[], windowStart: number) =>
      keys.map((key) => {
        counts.set(id(key, windowStart), (counts.get(id(key, windowStart)) ?? 0) + 1);
        return counts.get(id(key, windowStart))!;
      }),
    ),
    count: vi.fn(async (keys: string[], windowStart: number) => keys.map((key) => counts.get(id(key, windowStart)) ?? 0)),
    purgeBefore: vi.fn(async () => {}),
  } satisfies RateLimitRepository;
  return repository;
}

// #32 : au plus `max` modifications par minute et par client, et `globalMax` pour tous les clients.
describe("couche service · rate-limit.service (#32)", () => {
  let time: number;
  const now = () => new Date(time);
  const limits = { max: 3, globalMax: 5, windowMs: 60_000 };

  beforeEach(() => {
    time = new Date("2026-11-22T10:00:10Z").getTime();
  });

  it("accepte jusqu'à la limite, puis refuse avec un message ; une autre adresse n'est pas concernée", async () => {
    const service = createRateLimitService(fakeRepository(), now, limits);

    for (let i = 0; i < 3; i++) expect(await service.check("203.0.113.7")).toEqual({ ok: true });
    expect(await service.check("203.0.113.7")).toEqual(TOO_MANY);
    expect(await service.check("198.51.100.2")).toEqual({ ok: true });
  });

  // Revue de #32 : un appel refusé ne coûte aucune écriture en base.
  it("n'écrit rien en base pour un appel refusé", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, limits);
    for (let i = 0; i < 3; i++) await service.check("203.0.113.7");
    repository.hit.mockClear();

    await service.check("203.0.113.7");

    expect(repository.hit).not.toHaveBeenCalled();
  });

  // Contrôle de sécurité : une adresse IPv6 change facilement à l'intérieur de son bloc /64.
  it("compte les adresses IPv6 par bloc /64, quelle que soit leur écriture", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, limits);

    await service.check("2001:db8:1:2::1");
    await service.check("2001:0DB8:0001:0002:aaaa:bbbb:cccc:dddd");
    await service.check("2001:db8:1:2:ffff::");

    expect(repository.hit).toHaveBeenCalledWith(["write:2001:db8:1:2::/64", "write:*"], expect.any(Number));
    expect(await service.check("2001:db8:1:2::9")).toEqual(TOO_MANY);
  });

  it("refuse tout le monde au-delà du plafond global", async () => {
    const service = createRateLimitService(fakeRepository(), now, limits);
    const addresses = ["192.0.2.1", "192.0.2.2", "192.0.2.3", "192.0.2.4", "192.0.2.5"];
    for (const ip of addresses) expect(await service.check(ip)).toEqual({ ok: true });

    expect(await service.check("192.0.2.6")).toEqual(TOO_MANY);
  });

  it("compte par fenêtre alignée sur la minute : la suivante repart de zéro", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, { ...limits, max: 1 });

    await service.check("203.0.113.7");
    expect(repository.hit).toHaveBeenLastCalledWith(expect.any(Array), new Date("2026-11-22T10:00:00Z").getTime());
    expect(await service.check("203.0.113.7")).toEqual(TOO_MANY);

    time = new Date("2026-11-22T10:01:05Z").getTime();
    expect(await service.check("203.0.113.7")).toEqual({ ok: true });
  });

  // Revue de #32 : nettoyage rare (premier appel d'un client dans la minute), en gardant la minute précédente
  // pour ne pas effacer les compteurs d'un serveur dont l'horloge serait un peu en retard.
  it("efface les vieilles fenêtres seulement au premier appel d'un client dans la minute", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, limits);

    await service.check("203.0.113.7");
    await service.check("203.0.113.7");

    expect(repository.purgeBefore).toHaveBeenCalledTimes(1);
    expect(repository.purgeBefore).toHaveBeenCalledWith(new Date("2026-11-22T09:59:00Z").getTime());
  });

  it("met une adresse absente ou invalide dans une clé commune, sans la stocker telle quelle", async () => {
    const repository = fakeRepository();
    const service = createRateLimitService(repository, now, limits);

    await service.check("");
    await service.check("x".repeat(500));

    expect(repository.hit).toHaveBeenNthCalledWith(1, ["write:inconnu", "write:*"], expect.any(Number));
    expect(repository.hit).toHaveBeenNthCalledWith(2, ["write:inconnu", "write:*"], expect.any(Number));
  });
});
