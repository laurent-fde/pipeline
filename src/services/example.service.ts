// Couche service : règles métier et validation.
// Ne connaît pas la base : il reçoit la couche données en paramètre.

import {
  createExampleRepository,
  type Example,
  type ExampleRepository,
} from "@/data/example.repository";

export function createExampleService(repository: ExampleRepository) {
  return {
    async listExamples(): Promise<Example[]> {
      return repository.findAll();
    },
  };
}

export type ExampleService = ReturnType<typeof createExampleService>;

// Branchement : seul endroit qui choisit la couche données concrète.
export function getExampleService(): ExampleService {
  return createExampleService(createExampleRepository());
}
