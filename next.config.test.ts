// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

// #33 : en-têtes de protection envoyés sur toutes les pages.
describe("next.config · en-têtes HTTP de protection", () => {
  it("interdit l'affichage dans un cadre, le devinage de type et limite le référent, sur toutes les pages", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries((all?.headers ?? []).map(({ key, value }) => [key, value]));

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
