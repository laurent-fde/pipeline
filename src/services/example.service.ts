// Couche service : règles métier et validation.
// Ne connaît pas la base : il reçoit la couche données en paramètre.

import type { Example, ExampleRepository } from "@/data/example.repository";

export function createExampleService(repository: ExampleRepository) {
  return {
    async listExamples(): Promise<Example[]> {
      return repository.findAll();
    },
  };
}

export type ExampleService = ReturnType<typeof createExampleService>;
