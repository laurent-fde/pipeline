import { describe, expect, it } from "vitest";
import { createExampleRepository } from "./example.repository";

describe("couche données · example.repository", () => {
  it("renvoie une liste vide tant qu'aucune base n'est branchée", async () => {
    const repository = createExampleRepository();
    expect(await repository.findAll()).toEqual([]);
  });
});
