"use server";

// Couche présentation : action déclenchée par l'utilisateur.
// Passe toujours par un service, jamais directement par la couche données.

import { getExampleService } from "@/services/example.service";

export async function listExamplesAction() {
  return getExampleService().listExamples();
}
