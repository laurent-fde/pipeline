import { describe, expect, it, vi } from "vitest";

const listExamples = vi.fn(async () => [{ id: "1", name: "Exemple" }]);

vi.mock("@/services/example.service", () => ({
  createExampleService: () => ({ listExamples }),
}));

import { listExamplesAction } from "./example.action";

describe("couche présentation · example.action", () => {
  it("passe par le service pour obtenir les données", async () => {
    expect(await listExamplesAction()).toEqual([{ id: "1", name: "Exemple" }]);
    expect(listExamples).toHaveBeenCalledOnce();
  });
});
