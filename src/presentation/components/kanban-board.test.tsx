import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board, Contact } from "@/services/contact.service";
import { allowedMoves, reopenTargets } from "@/services/stages";
import { KanbanBoard } from "./kanban-board";

afterEach(cleanup);

const LABELS = [
  ["nouveau", "Nouveau"],
  ["contacte", "Contacté"],
  ["rdv", "RDV"],
  ["proposition", "Proposition"],
  ["gagne", "Gagné"],
  ["perdu", "Perdu"],
] as const;

const contact = (id: string, name: string, stage: string): Contact => ({
  id,
  name,
  company: null,
  email: null,
  phone: null,
  stage,
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
});

function board(contacts: Contact[]): Board {
  const columns = LABELS.map(([stage, label]) => {
    const inColumn = contacts.filter((c) => c.stage === stage);
    // Les vraies règles de stages.ts, pour que la fixture ne dérive plus du service (#16).
    return {
      stage,
      label,
      count: inColumn.length,
      contacts: inColumn,
      moves: allowedMoves(stage),
      reopenTargets: reopenTargets(stage),
    };
  });
  return { columns, total: contacts.length };
}

const column = (label: string) => screen.getByRole("region", { name: label });

describe("couche présentation · KanbanBoard", () => {
  // Critère 1 : colonnes Nouveau, Contacté, RDV, Proposition, Gagné et Perdu, dans cet ordre.
  it("affiche les six colonnes dans l'ordre", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Nouveau",
      "Contacté",
      "RDV",
      "Proposition",
      "Gagné",
      "Perdu",
    ]);
  });

  // Critère 2 : un contact à l'étape « nouveau » est dans la colonne Nouveau.
  it("place chaque contact dans la colonne de son étape", () => {
    render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "rdv")])} />,
    );

    expect(within(column("Nouveau")).getByText("Claire Martin")).toBeDefined();
    expect(within(column("Nouveau")).queryByText("Paul Durand")).toBeNull();
    expect(within(column("RDV")).getByText("Paul Durand")).toBeDefined();
  });

  // Critère 3 : chaque colonne indique son nombre de contacts.
  it("indique le nombre de contacts de chaque colonne, zéro compris", () => {
    render(
      <KanbanBoard
        board={board([
          contact("1", "Claire Martin", "nouveau"),
          contact("2", "Paul Durand", "nouveau"),
          contact("3", "Inès Roy", "rdv"),
        ])}
      />,
    );

    expect(within(column("Nouveau")).getByLabelText("2 contacts")).toBeDefined();
    expect(within(column("RDV")).getByLabelText("1 contact")).toBeDefined();
    expect(within(column("Perdu")).getByLabelText("0 contact")).toBeDefined();
  });

  // Critère 4 : aucun contact, un message invite à ajouter le premier contact.
  it("invite à ajouter le premier contact quand il n'y en a aucun, colonnes comprises", () => {
    render(<KanbanBoard board={board([])} />);

    expect(screen.getByText(/ajoute ton premier contact/i)).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("n'affiche plus l'invitation dès qu'il y a un contact", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(screen.queryByText(/ajoute ton premier contact/i)).toBeNull();
  });

  // Lot 3 · Critère 4 : sur la carte d'un contact Gagné, « Étape suivante » est indisponible.
  it("affiche les boutons d'étape sur chaque carte, selon les déplacements permis de la colonne", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "gagne")])}
        moveAction={vi.fn()}
      />,
    );

    const suivante = (label: string) =>
      within(column(label)).getByRole("button", { name: "Étape suivante" }) as HTMLButtonElement;
    expect(suivante("Nouveau").disabled).toBe(false);
    expect(suivante("Gagné").disabled).toBe(true);
  });

  // #16 : les cibles de « Rouvrir vers… » de la colonne arrivent jusqu'aux cartes.
  it("propose « Rouvrir vers… » sur une carte Perdu, pas sur une carte RDV", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "perdu"), contact("2", "Paul Durand", "rdv")])}
        moveAction={vi.fn()}
        reopenAction={vi.fn()}
      />,
    );

    expect(within(column("Perdu")).getByRole("button", { name: /Rouvrir vers/ })).toBeDefined();
    expect(within(column("RDV")).queryByRole("button", { name: /Rouvrir vers/ })).toBeNull();
  });

  it("n'active pas « Étape précédente » sur une carte Gagné ou Perdu", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "gagne"), contact("2", "Paul Durand", "perdu")])}
        moveAction={vi.fn()}
        reopenAction={vi.fn()}
      />,
    );

    for (const label of ["Gagné", "Perdu"]) {
      const precedente = within(column(label)).queryByRole("button", { name: "Étape précédente" }) as HTMLButtonElement | null;
      expect(precedente === null || precedente.disabled).toBe(true);
    }
  });
});
