import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactCard } from "./contact-card";

afterEach(cleanup);

const claire = {
  id: "1",
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: "06 12 34 56 78",
  stage: "nouveau",
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
  followUp: null,
};

describe("couche présentation · ContactCard", () => {
  // Lot 1 · Critère 1 et lot 9 · Critère 4 : la carte compacte montre le nom et l'entreprise.
  it("montre le nom et l'entreprise, sans les coordonnées (elles sont dans la fiche)", () => {
    render(<ContactCard contact={claire} />);

    expect(screen.getByRole("heading", { name: "Claire Martin", level: 4 })).toBeDefined();
    expect(screen.getByText("Atelier Lumen")).toBeDefined();
    expect(screen.queryByText("claire@lumen.fr")).toBeNull();
    expect(screen.queryByText("06 12 34 56 78")).toBeNull();
  });

  it("n'affiche pas l'entreprise absente", () => {
    render(<ContactCard contact={{ ...claire, company: null }} />);

    expect(screen.queryByText("Atelier Lumen")).toBeNull();
  });

  // Lot 5 · Critère 2 : une relance faite affiche le badge « En attente de réponse ».
  it("affiche « En attente de réponse » quand la relance est faite, et seulement alors", () => {
    const { rerender } = render(<ContactCard contact={{ ...claire, awaitingReply: true }} />);
    expect(screen.getByText("En attente de réponse")).toBeDefined();

    rerender(<ContactCard contact={claire} />);
    expect(screen.queryByText("En attente de réponse")).toBeNull();
  });

  // Lot 9 · Critère 4 : le badge de relance suit l'état donné par le service.
  it.each([
    ["overdue", "2026-11-18", "en retard"],
    ["today", "2026-11-21", "aujourd'hui"],
    ["upcoming", "2026-11-28", "2026-11-28"],
  ] as const)("affiche le badge de relance %s", (followUp, followUpOn, text) => {
    render(<ContactCard contact={{ ...claire, followUp, followUpOn }} />);

    expect(screen.getByText(text)).toBeDefined();
  });

  it("n'affiche aucun badge de relance sans relance", () => {
    render(<ContactCard contact={claire} />);

    expect(screen.queryByText("en retard")).toBeNull();
    expect(screen.queryByText("aujourd'hui")).toBeNull();
  });
});
