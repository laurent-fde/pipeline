"use server";

// Couche présentation : action déclenchée par l'utilisateur.
// Passe toujours par un service, jamais directement par la couche données.

import { createExampleRepository } from "@/data/example.repository";
import { createExampleService } from "@/services/example.service";

export async function listExamplesAction() {
  const service = createExampleService(createExampleRepository());
  return service.listExamples();
}
