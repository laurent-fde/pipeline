import { createRateLimitRepository, type RateLimitRepository } from "@/data/rate-limit.repository";
import { z } from "zod";

// #32 : l'app est publique, sans connexion (#19). Pour qu'un script ne remplisse pas la base jusqu'au
// quota : au plus 30 modifications par minute et par client, et 300 pour tous les clients ensemble.
export const WRITE_LIMIT = { max: 30, globalMax: 300, windowMs: 60_000 };

export type RateLimitResult = { ok: true } | { ok: false; error: string };

const TOO_MANY: RateLimitResult = {
  ok: false,
  error: "Trop de modifications d'un coup. Attends une minute et réessaie.",
};
const GLOBAL_KEY = "write:*";
const ipSchema = z.union([z.ipv4(), z.ipv6()]);

// Le client compté : l'adresse IPv4 exacte, ou le bloc /64 d'une adresse IPv6 (un accès internet IPv6
// en fournit des milliards : compter l'adresse exacte se contournerait en changeant d'adresse).
// Adresse absente ou invalide : une clé commune, jamais la valeur reçue (elle vient d'un en-tête HTTP).
function clientKey(ip: string): string {
  const parsed = ipSchema.safeParse(ip.trim());
  if (!parsed.success) return "write:inconnu";
  const address = parsed.data.toLowerCase();
  if (!address.includes(":")) return `write:${address}`;

  const [head, tail = ""] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = address.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  const prefix = groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, ""));
  return `write:${prefix.join(":")}::/64`;
}

export function createRateLimitService(
  repository: RateLimitRepository,
  now: () => Date = () => new Date(),
  { max, globalMax, windowMs } = WRITE_LIMIT,
) {
  return {
    async check(ip: string): Promise<RateLimitResult> {
      const time = now().getTime();
      const windowStart = time - (time % windowMs);
      const keys = [clientKey(ip), GLOBAL_KEY];

      // Lire d'abord : un appel refusé ne coûte aucune écriture en base.
      const [mine, all] = await repository.count(keys, windowStart);
      if (mine >= max || all >= globalMax) return TOO_MANY;

      const [counted] = await repository.hit(keys, windowStart);
      // Nettoyage rare : au premier appel d'un client dans la minute. La minute précédente est gardée,
      // pour ne pas effacer les compteurs d'un serveur dont l'horloge serait un peu en retard.
      if (counted === 1) await repository.purgeBefore(windowStart - windowMs);
      return { ok: true };
    },
  };
}

export type RateLimitService = ReturnType<typeof createRateLimitService>;

export function getRateLimitService(): RateLimitService {
  return createRateLimitService(createRateLimitRepository());
}
