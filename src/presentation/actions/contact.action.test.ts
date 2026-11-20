// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted : les simulations doivent exister avant les vi.mock, remontés en haut du fichier.
const { addContact, refresh } = vi.hoisted(() => ({ addContact: vi.fn(), refresh: vi.fn() }));

vi.mock("@/services/contact.service", () => ({
  getContactService: () => ({ addContact }),
}));
vi.mock("next/cache", () => ({ refresh }));

import { addContactAction } from "./contact.action";

function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

const saisie = { name: "Claire Martin", company: "Atelier Lumen", email: "claire@lumen.fr", phone: "06 12 34 56 78" };

describe("couche présentation · contact.action", () => {
  beforeEach(() => {
    addContact.mockReset();
    refresh.mockReset();
  });

  // Critère 1 : le contact ajouté apparaît dans la liste (la page est rafraîchie).
  it("passe la saisie au service et rafraîchit la page quand l'ajout réussit", async () => {
    addContact.mockResolvedValue({ ok: true, contact: { id: "1", ...saisie } });

    const state = await addContactAction({}, formData(saisie));

    expect(addContact).toHaveBeenCalledWith(saisie);
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({});
  });

  // Critères 2 et 3 : les erreurs du service reviennent au formulaire, avec la saisie.
  it("renvoie les erreurs et la saisie sans rafraîchir quand le service refuse", async () => {
    const errors = { name: "Le nom est obligatoire", email: "L'e-mail n'est pas valide" };
    addContact.mockResolvedValue({ ok: false, errors });
    const invalide = { ...saisie, name: "", email: "faux" };

    const state = await addContactAction({}, formData(invalide));

    expect(state).toEqual({ errors, values: invalide });
    expect(refresh).not.toHaveBeenCalled();
  });
});
