import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StageControls } from "./stage-controls";

afterEach(cleanup);

const allMoves = { previous: true, next: true, lost: true };
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("couche présentation · StageControls (lot 3)", () => {
  // Critères 1 à 3 : chaque bouton envoie le bon déplacement pour ce contact.
  it.each([
    ["Étape suivante", "next"],
    ["Étape précédente", "previous"],
    ["Marquer perdu", "lost"],
  ])("« %s » demande le déplacement %s", async (name, move) => {
    const action = vi.fn(async () => ({}));
    render(<StageControls contactId="42" contactName="Claire Martin" moves={allMoves} action={action} />);

    fireEvent.click(button(name));

    await vi.waitFor(() => expect(action).toHaveBeenCalledWith("42", move));
  });

  // Critère 4 : « Étape suivante » indisponible quand le service l'interdit (Gagné, Perdu).
  it("rend indisponibles les déplacements interdits", () => {
    render(
      <StageControls
        contactId="42"
        contactName="Claire Martin"
        moves={{ previous: true, next: false, lost: false }}
        action={vi.fn()}
      />,
    );

    expect(button("Étape suivante").disabled).toBe(true);
    expect(button("Marquer perdu").disabled).toBe(true);
    expect(button("Étape précédente").disabled).toBe(false);
  });

  it("annonce l'erreur renvoyée par l'action", async () => {
    const action = vi.fn(async () => ({ error: "Impossible de déplacer le contact, réessaie." }));
    render(<StageControls contactId="42" contactName="Claire Martin" moves={allMoves} action={action} />);

    fireEvent.click(button("Étape suivante"));

    expect((await screen.findByRole("alert")).textContent).toBe("Impossible de déplacer le contact, réessaie.");
  });

  // Remarque sur #3 : « Rouvrir vers… » déplie les étapes proposées, un clic rouvre le contact.
  it("rouvre un contact Gagné ou Perdu vers l'étape choisie", async () => {
    const reopenAction = vi.fn(async () => ({}));
    render(
      <StageControls
        contactId="42"
        contactName="Claire Martin"
        moves={{ previous: false, next: false, lost: false }}
        action={vi.fn()}
        reopenTargets={[
          { stage: "nouveau", label: "Nouveau" },
          { stage: "rdv", label: "RDV" },
        ]}
        reopenAction={reopenAction}
      />,
    );

    expect(screen.queryByRole("button", { name: "RDV" })).toBeNull();
    fireEvent.click(button("Rouvrir vers…"));
    expect(button("Rouvrir vers…").getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button("RDV"));

    await vi.waitFor(() => expect(reopenAction).toHaveBeenCalledWith("42", "rdv"));
    // #17 : après un succès, la liste se referme.
    await vi.waitFor(() => expect(button("Rouvrir vers…").getAttribute("aria-expanded")).toBe("false"));
    expect(screen.queryByRole("button", { name: "RDV" })).toBeNull();
  });

  // #17 : un refus est annoncé, et la liste reste ouverte pour choisir une autre étape.
  it("annonce l'erreur de « Rouvrir vers… » et garde la liste ouverte", async () => {
    const reopenAction = vi.fn(async () => ({ error: "Impossible de rouvrir le contact, réessaie." }));
    render(
      <StageControls
        contactId="42"
        contactName="Claire Martin"
        moves={{ previous: false, next: false, lost: false }}
        action={vi.fn()}
        reopenTargets={[{ stage: "rdv", label: "RDV" }]}
        reopenAction={reopenAction}
      />,
    );

    fireEvent.click(button("Rouvrir vers…"));
    fireEvent.click(button("RDV"));

    expect((await screen.findByRole("alert")).textContent).toBe("Impossible de rouvrir le contact, réessaie.");
    expect(button("Rouvrir vers…").getAttribute("aria-expanded")).toBe("true");
    expect(button("RDV")).toBeDefined();
  });

  it("n'affiche pas « Rouvrir vers… » sur un contact en cours", () => {
    render(<StageControls contactId="42" contactName="Claire Martin" moves={allMoves} action={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Rouvrir vers…" })).toBeNull();
  });

  it("nomme le groupe de boutons avec le contact concerné", () => {
    render(<StageControls contactId="42" contactName="Claire Martin" moves={allMoves} action={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Étape de Claire Martin" })).toBeDefined();
  });
});
