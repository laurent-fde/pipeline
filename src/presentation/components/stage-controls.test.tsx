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

  it("nomme le groupe de boutons avec le contact concerné", () => {
    render(<StageControls contactId="42" contactName="Claire Martin" moves={allMoves} action={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Étape de Claire Martin" })).toBeDefined();
  });
});
