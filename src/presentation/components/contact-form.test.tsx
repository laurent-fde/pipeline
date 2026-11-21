import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import { ContactForm } from "./contact-form";

afterEach(cleanup);

function renderWithResponse(response: ContactFormState) {
  const action = vi.fn(async () => response);
  render(<ContactForm action={action} />);
  return action;
}

describe("couche présentation · ContactForm", () => {
  it("propose les 4 champs, chacun avec son libellé", () => {
    renderWithResponse({});

    for (const label of ["Nom", "Entreprise", "E-mail", "Téléphone"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
  });

  // Critère 2 : nom vide, « Le nom est obligatoire » s'affiche, relié au champ.
  it("affiche « Le nom est obligatoire » relié au champ Nom", async () => {
    renderWithResponse({ errors: { name: "Le nom est obligatoire" }, values: { name: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le contact" }));

    const message = await screen.findByText("Le nom est obligatoire");
    const champ = screen.getByLabelText("Nom");
    expect(champ.getAttribute("aria-invalid")).toBe("true");
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
  });

  // Critère 3 : e-mail mal formé, « L'e-mail n'est pas valide » s'affiche, relié au champ.
  it("affiche « L'e-mail n'est pas valide » relié au champ E-mail, et garde la saisie", async () => {
    renderWithResponse({
      errors: { email: "L'e-mail n'est pas valide" },
      values: { name: "Claire", email: "pas-un-mail" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le contact" }));

    const message = await screen.findByText("L'e-mail n'est pas valide");
    const champ = screen.getByLabelText("E-mail") as HTMLInputElement;
    expect(champ.getAttribute("aria-invalid")).toBe("true");
    expect(champ.getAttribute("aria-describedby")).toBe(message.id);
    expect(champ.value).toBe("pas-un-mail");
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Claire");
  });

  it("affiche « Ajout en cours… » pendant l'envoi, puis revient au libellé normal", async () => {
    let terminer!: (state: ContactFormState) => void;
    const action = vi.fn(() => new Promise<ContactFormState>((resolve) => (terminer = resolve)));
    render(<ContactForm action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le contact" }));

    const enCours = await screen.findByRole("button", { name: "Ajout en cours…" });
    expect((enCours as HTMLButtonElement).disabled).toBe(true);

    await act(async () => terminer({}));

    const bouton = await screen.findByRole("button", { name: "Ajouter le contact" });
    expect((bouton as HTMLButtonElement).disabled).toBe(false);
  });

  it("annonce l'échec d'enregistrement et garde la saisie", async () => {
    renderWithResponse({
      formError: "Impossible d'enregistrer le contact, réessaie.",
      values: { name: "Claire" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Ajouter le contact" }));

    const alerte = await screen.findByRole("alert");
    expect(alerte.textContent).toBe("Impossible d'enregistrer le contact, réessaie.");
    expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Claire");
  });
});
