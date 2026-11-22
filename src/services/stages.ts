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

const CLOSED_STAGES: readonly string[] = ["gagne", "perdu"];

// Les étapes en cours : vers elles, un contact Gagné ou Perdu peut être rouvert.
const OPEN_STAGES = STAGES.filter((stage) => !CLOSED_STAGES.includes(stage.id));

export type ReopenTarget = { stage: Stage; label: string };

// L'étape d'arrivée d'un déplacement, ou null s'il n'est pas permis.
// « Étape suivante » s'arrête à Gagné ; « Étape précédente » s'arrête à Nouveau et ne sert pas
// sur Gagné ou Perdu : on en sort avec « Rouvrir vers… », vers une étape choisie.
export function targetStage(stage: string, move: Move): Stage | null {
  const index = ORDER.indexOf(stage);
  if (index === -1) return null;
  if (move === "lost") return stage === "perdu" ? null : "perdu";
  if (CLOSED_STAGES.includes(stage)) return null;
  if (move === "next") return STAGES[index + 1].id;
  return index === 0 ? null : STAGES[index - 1].id;
}

// Les étapes vers lesquelles rouvrir un contact : toutes celles en cours s'il est Gagné ou Perdu, aucune sinon.
export function reopenTargets(stage: string): ReopenTarget[] {
  return CLOSED_STAGES.includes(stage) ? OPEN_STAGES.map(({ id, label }) => ({ stage: id, label })) : [];
}

export function allowedMoves(stage: string): AllowedMoves {
  return {
    previous: targetStage(stage, "previous") !== null,
    next: targetStage(stage, "next") !== null,
    lost: targetStage(stage, "lost") !== null,
  };
}

// Lot 8 : les colonnes où déposer une carte, dans l'ordre du tableau. Aucune règle nouvelle :
// ce sont les arrivées des déplacements permis (suivante, précédente, Perdu) et de « Rouvrir vers… ».
export function dropTargets(stage: string): Stage[] {
  const targets = new Set<string>([
    ...MOVES.map((move) => targetStage(stage, move)).filter((target) => target !== null),
    ...reopenTargets(stage).map((target) => target.stage),
  ]);
  return STAGES.filter(({ id }) => targets.has(id)).map(({ id }) => id);
}
