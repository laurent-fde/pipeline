import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import { NewContactDialog } from "./new-contact-dialog";

afterEach(cleanup);

const openDialog = () => fireEvent.click(screen.getByRole("button", { name: "Nouveau contact" }));
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Ajouter le contact" }));

describe("couche présentation · NewContactDialog (lot 9)", () => {
  // Lot 9 · Critère 1 : le formulaire n'est pas affiché en permanence.
  it("n'affiche le formulaire qu'après un clic sur « Nouveau contact »", () => {
    render(<NewContactDialog action={vi.fn()} />);
    expect(screen.queryByLabelText(/Nom/)).toBeNull();

    openDialog();
    expect(screen.getByRole("dialog", { name: "Nouveau contact" })).toBeDefined();
    expect(screen.getByLabelText(/Nom/)).toBeDefined();
  });

  // Lot 9 · Critère 2 : un ajout réussi ferme la fenêtre.
  it("ferme la fenêtre après un ajout réussi", async () => {
    const action = vi.fn(async (): Promise<ContactFormState> => ({}));
    render(<NewContactDialog action={action} />);

    openDialog();
    fireEvent.change(screen.getByLabelText(/Nom/), { target: { value: "Claire Martin" } });
    submit();

    await vi.waitFor(() => expect(action).toHaveBeenCalled());
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // Lot 9 · Critère 2 : une saisie refusée garde la fenêtre ouverte avec le message.
  it("garde la fenêtre ouverte avec le message quand la saisie est refusée", async () => {
    const action = vi.fn(async (): Promise<ContactFormState> => ({ errors: { name: "Le nom est obligatoire" } }));
    render(<NewContactDialog action={action} />);

    openDialog();
    submit();

    expect(await screen.findByText("Le nom est obligatoire")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
  });
});
