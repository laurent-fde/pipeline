// Couche données : seul endroit de l'app qui parlera à la base.
// Exemple vide : aucune base n'est branchée pour l'instant.

export type Example = {
  id: string;
  name: string;
};

export interface ExampleRepository {
  findAll(): Promise<Example[]>;
}

export function createExampleRepository(): ExampleRepository {
  return {
    async findAll() {
      return [];
    },
  };
}
