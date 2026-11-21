import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FollowUpState } from "@/presentation/actions/contact.action";
import { FollowUpForm } from "./follow-up-form";

afterEach(cleanup);

describe("couche présentation · FollowUpForm (lot 4)", () => {
  // Critère 1 : je fixe la relance d'un contact, la date part au serveur avec le contact.
  it("envoie la date choisie avec l'identifiant du contact", async () => {
    const action = vi.fn<(prev: FollowUpState, data: FormData) => Promise<FollowUpState>>(async () => ({}));
    render(<FollowUpForm contactId="42" followUpOn={null} action={action} />);

    fireEvent.change(screen.getByLabelText("Relance"), { target: { value: "2026-11-21" } });
    fireEvent.click(screen.getByRole("button", { name: "Fixer la relance" }));

    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0][1];
    expect(data.get("contactId")).toBe("42");
    expect(data.get("date")).toBe("2026-11-21");
  });

  it("affiche la date de relance actuelle", () => {
    render(<FollowUpForm contactId="42" followUpOn="2026-11-25" action={vi.fn()} />);

    expect((screen.getByLabelText("Relance") as HTMLInputElement).value).toBe("2026-11-25");
  });

  it("affiche l'erreur reliée au champ", async () => {
    const action = vi.fn(async (): Promise<FollowUpState> => ({ error: "La date n'est pas valide" }));
    render(<FollowUpForm contactId="42" followUpOn={null} action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Fixer la relance" }));

    const message = await screen.findByText("La date n'est pas valide");
    const champ = screen.getByLabelText("Relance");
    expect(champ.getAttribute("aria-invalid")).toBe("true");
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
  });
});
