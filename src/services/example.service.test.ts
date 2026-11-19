import { describe, expect, it } from "vitest";
import type { ExampleRepository } from "@/data/example.repository";
import { createExampleService } from "./example.service";

describe("couche service · example.service", () => {
  it("renvoie ce que fournit la couche données, sans vraie base", async () => {
    const fakeRepository: ExampleRepository = {
      findAll: async () => [{ id: "1", name: "Exemple" }],
    };
    const service = createExampleService(fakeRepository);

    expect(await service.listExamples()).toEqual([{ id: "1", name: "Exemple" }]);
  });
});
