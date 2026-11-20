import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
