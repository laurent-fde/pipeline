import { getDatabase, type Database } from "./db";

// #32 : le compteur d'appels. Il lit et écrit, sans rien décider : la limite est au service.
export interface RateLimitRepository {
  // Ajoute un appel pour cette clé dans la fenêtre qui commence à windowStart, et renvoie le total.
  hit(key: string, windowStart: number): Promise<number>;
}

export function createRateLimitRepository(db: Database = getDatabase()): RateLimitRepository {
  return {
    async hit(key, windowStart) {
      await db.ready;
      // Une seule transaction : les fenêtres passées sont effacées, puis l'appel est compté.
      const [, counted] = await db.client.batch(
        [
          { sql: "DELETE FROM rate_limits WHERE window_start < ?", args: [windowStart] },
          {
            sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
                  ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
                  RETURNING count`,
            args: [key, windowStart],
          },
        ],
        "write",
      );
      return Number(counted.rows[0].count);
    },
  };
}
