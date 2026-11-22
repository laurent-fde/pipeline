import { createRateLimitRepository, type RateLimitRepository } from "@/data/rate-limit.repository";
import { z } from "zod";

// #32 : l'app est publique, sans connexion (#19). Au plus 30 modifications par minute et par adresse,
// pour qu'un script ne puisse pas remplir la base jusqu'au quota.
export const WRITE_LIMIT = { max: 30, windowMs: 60_000 };

export type RateLimitResult = { ok: true } | { ok: false; error: string };

const TOO_MANY = "Trop de modifications d'un coup. Attends une minute et réessaie.";
// La clé vient d'un en-tête HTTP : elle n'est stockée que si elle a une taille raisonnable.
const keySchema = z.string().trim().min(1).max(100);

export function createRateLimitService(
  repository: RateLimitRepository,
  now: () => Date = () => new Date(),
  { max, windowMs } = WRITE_LIMIT,
) {
  return {
    async check(key: string): Promise<RateLimitResult> {
      const parsed = keySchema.safeParse(key);
      const time = now().getTime();
      const windowStart = time - (time % windowMs);
      const count = await repository.hit(parsed.success ? parsed.data : "inconnu", windowStart);
      return count <= max ? { ok: true } : { ok: false, error: TOO_MANY };
    },
  };
}

export type RateLimitService = ReturnType<typeof createRateLimitService>;

export function getRateLimitService(): RateLimitService {
  return createRateLimitService(createRateLimitRepository());
}
