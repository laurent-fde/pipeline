import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import type { Contact } from "@/services/contact.service";
import { ContactActions } from "./contact-actions";

afterEach(cleanup);

const claire: Contact = {
  id: "7",
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: null,
  stage: "rdv",
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
};

function renderActions(updateResponse: ContactFormState = { saved: true }) {
  const updateAction = vi.fn<(prev: ContactFormState, data: FormData) => Promise<ContactFormState>>(
    async () => updateResponse,
  );
  const deleteAction = vi.fn(async () => ({}));
  render(<ContactActions contact={claire} updateAction={updateAction} deleteAction={deleteAction} />);
  return { updateAction, deleteAction };
}

const button = (name: string) => screen.getByRole("button", { name });

describe("couche présentation · ContactActions (lot 6)", () => {
  // Critère 1 : je modifie l'entreprise et je valide, la modification part avec le contact.
  it("ouvre le formulaire pré-rempli et envoie la modification avec l'identifiant du contact", async () => {
    const { updateAction } = renderActions();

    fireEvent.click(button("Modifier Claire Martin"));
    const entreprise = screen.getByLabelText("Entreprise") as HTMLInputElement;
    expect(entreprise.value).toBe("Atelier Lumen");
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Claire Martin");
    fireEvent.change(entreprise, { target: { value: "Studio Nord" } });
    fireEvent.click(button("Enregistrer"));

    await vi.waitFor(() => expect(updateAction).toHaveBeenCalled());
    const data = updateAction.mock.calls[0][1];
    expect(data.get("contactId")).toBe("7");
    expect(data.get("company")).toBe("Studio Nord");
    // Enregistré : le formulaire se referme.
    await vi.waitFor(() => expect(screen.queryByLabelText("Entreprise")).toBeNull());
  });

  // Critère 2 : nom vide, « Le nom est obligatoire » s'affiche et le formulaire reste ouvert.
  it("garde le formulaire ouvert et affiche l'erreur quand le nom est vide", async () => {
    renderActions({ errors: { name: "Le nom est obligatoire" }, values: { name: "" } });

    fireEvent.click(button("Modifier Claire Martin"));
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "" } });
    fireEvent.click(button("Enregistrer"));

    expect(await screen.findByText("Le nom est obligatoire")).toBeDefined();
    expect(screen.getByLabelText("Nom")).toBeDefined();
  });

  it("referme le formulaire sans rien envoyer avec « Annuler »", () => {
    const { updateAction } = renderActions();

    fireEvent.click(button("Modifier Claire Martin"));
    fireEvent.click(button("Annuler"));

    expect(screen.queryByLabelText("Entreprise")).toBeNull();
    expect(updateAction).not.toHaveBeenCalled();
  });

  // Critère 3 : « Supprimer » puis confirmer, la suppression part pour ce contact.
  it("supprime le contact après confirmation", async () => {
    const { deleteAction } = renderActions();

    fireEvent.click(button("Supprimer Claire Martin"));
    expect(deleteAction).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer Claire Martin ?")).toBeDefined();
    fireEvent.click(button("Confirmer la suppression"));

    await vi.waitFor(() => expect(deleteAction).toHaveBeenCalledWith("7"));
  });

  // Critère 4 : à la demande de confirmation, « Annuler » garde le contact.
  it("ne supprime rien si j'annule la confirmation", () => {
    const { deleteAction } = renderActions();

    fireEvent.click(button("Supprimer Claire Martin"));
    fireEvent.click(button("Annuler"));

    expect(deleteAction).not.toHaveBeenCalled();
    expect(screen.queryByText("Supprimer Claire Martin ?")).toBeNull();
    expect(button("Supprimer Claire Martin")).toBeDefined();
  });
});
