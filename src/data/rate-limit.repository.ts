import { getDatabase, type Database } from "./db";

// #32 : les compteurs d'appels. Ils lisent et écrivent, sans rien décider : les limites sont au service.
export interface RateLimitRepository {
  // Les compteurs de ces clés dans la fenêtre qui commence à windowStart (0 si absents), sans rien écrire.
  count(keys: string[], windowStart: number): Promise<number[]>;
  // Ajoute un appel à chacune de ces clés, en une seule transaction, et renvoie les totaux.
  hit(keys: string[], windowStart: number): Promise<number[]>;
  // Efface les fenêtres qui commencent avant cette date.
  purgeBefore(windowStart: number): Promise<void>;
}

export function createRateLimitRepository(db: Database = getDatabase()): RateLimitRepository {
  return {
    async count(keys, windowStart) {
      await db.ready;
      const results = await db.client.batch(
        keys.map((key) => ({
          sql: "SELECT count FROM rate_limits WHERE key = ? AND window_start = ?",
          args: [key, windowStart],
        })),
        "read",
      );
      return results.map((result) => Number(result.rows[0]?.count ?? 0));
    },

    async hit(keys, windowStart) {
      await db.ready;
      const results = await db.client.batch(
        keys.map((key) => ({
          sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
                ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
                RETURNING count`,
          args: [key, windowStart],
        })),
        "write",
      );
      return results.map((result) => Number(result.rows[0].count));
    },

    async purgeBefore(windowStart) {
      await db.ready;
      await db.client.execute({ sql: "DELETE FROM rate_limits WHERE window_start < ?", args: [windowStart] });
    },
  };
}
