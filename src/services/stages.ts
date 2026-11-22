// Les étapes du pipeline et les règles pour passer de l'une à l'autre.

// Dans l'ordre du tableau. « Perdu » est atteignable depuis n'importe quelle étape.
export const STAGES = [
  { id: "nouveau", label: "Nouveau" },
  { id: "contacte", label: "Contacté" },
  { id: "rdv", label: "RDV" },
  { id: "proposition", label: "Proposition" },
  { id: "gagne", label: "Gagné" },
  { id: "perdu", label: "Perdu" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export const FIRST_STAGE: Stage = "nouveau";

export const MOVES = ["previous", "next", "lost"] as const;

export type Move = (typeof MOVES)[number];

export type AllowedMoves = Record<Move, boolean>;

const ORDER: readonly string[] = STAGES.map((stage) => stage.id);

// L'étape d'arrivée d'un déplacement, ou null s'il n'est pas permis.
// « Étape suivante » s'arrête à Gagné ; « Étape précédente » suit l'ordre des colonnes (Perdu revient à Gagné).
export function targetStage(stage: string, move: Move): Stage | null {
  const index = ORDER.indexOf(stage);
  if (index === -1) return null;
  if (move === "lost") return stage === "perdu" ? null : "perdu";
  if (move === "next") return stage === "gagne" || stage === "perdu" ? null : STAGES[index + 1].id;
  return index === 0 ? null : STAGES[index - 1].id;
}

export function allowedMoves(stage: string): AllowedMoves {
  return {
    previous: targetStage(stage, "previous") !== null,
    next: targetStage(stage, "next") !== null,
    lost: targetStage(stage, "lost") !== null,
  };
}
