import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactSheet } from "./contact-sheet";

afterEach(cleanup);

const claire = {
  id: "1",
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: "06 12 34 56 78",
  stage: "rdv",
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
};

const sheet = () => screen.getByRole("dialog", { name: "Claire Martin" });

// Lot 9 · Critère 5 : la fiche regroupe l'étape, les boutons d'étape, les coordonnées, la relance, modifier et supprimer.
describe("couche présentation · ContactSheet (lot 9)", () => {
  it("montre l'étape, les coordonnées cliquables et les blocs fournis par le tableau", () => {
    render(
      <ContactSheet
        contact={claire}
        stageLabel="RDV"
        open
        onOpenChange={vi.fn()}
        stage={<button>Étape suivante</button>}
        followUp={<label>Date de relance</label>}
        actions={<button>Modifier</button>}
      />,
    );

    expect(within(sheet()).getByText("RDV")).toBeDefined();
    expect(within(sheet()).getByText("Atelier Lumen")).toBeDefined();
    expect(within(sheet()).getByRole("link", { name: "claire@lumen.fr" }).getAttribute("href")).toBe(
      "mailto:claire@lumen.fr",
    );
    expect(within(sheet()).getByRole("link", { name: "06 12 34 56 78" }).getAttribute("href")).toBe("tel:0612345678");
    expect(within(sheet()).getByRole("button", { name: "Étape suivante" })).toBeDefined();
    expect(within(sheet()).getByText("Date de relance")).toBeDefined();
    expect(within(sheet()).getByRole("button", { name: "Modifier" })).toBeDefined();
  });

  it("annonce l'absence de coordonnées", () => {
    render(
      <ContactSheet contact={{ ...claire, email: null, phone: null }} stageLabel="RDV" open onOpenChange={vi.fn()} />,
    );

    expect(within(sheet()).getByText("Aucune coordonnée")).toBeDefined();
  });

  // Contrôle de sécurité : un téléphone qui n'est pas un numéro reste du texte, sans lien d'appel cassé.
  it("n'affiche pas de lien d'appel pour un téléphone qui n'est pas un numéro", () => {
    render(<ContactSheet contact={{ ...claire, phone: "abc?x=1" }} stageLabel="RDV" open onOpenChange={vi.fn()} />);

    expect(within(sheet()).getByText("abc?x=1")).toBeDefined();
    expect(within(sheet()).queryByRole("link", { name: "abc?x=1" })).toBeNull();
  });

  it("n'est pas affichée quand elle est fermée", () => {
    render(<ContactSheet contact={claire} stageLabel="RDV" open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
