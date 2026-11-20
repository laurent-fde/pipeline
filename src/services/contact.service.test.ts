// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Contact, ContactRepository, NewContact } from "@/data/contact.repository";
import { createContactService } from "./contact.service";

// Fausse couche données : un tableau en mémoire, jamais une vraie base.
function fakeRepository() {
  const contacts: Contact[] = [];
  const repository: ContactRepository = {
    insert: vi.fn(async (input: NewContact) => {
      const contact = { ...input, id: String(contacts.length + 1), createdAt: "2026-11-20T10:00:00.000Z" };
      contacts.unshift(contact);
      return contact;
    }),
    findAll: vi.fn(async () => [...contacts]),
  };
  return repository;
}

describe("couche service · contact.service", () => {
  // Critère 1 : je saisis un nom et je valide, le contact apparaît avec ses informations.
  it("enregistre un contact valide et le renvoie dans la liste avec ses informations", async () => {
    const service = createContactService(fakeRepository());

    const result = await service.addContact({
      name: "Claire Martin",
      company: "Atelier Lumen",
      email: "claire@lumen.fr",
      phone: "06 12 34 56 78",
    });

    expect(result.ok).toBe(true);
    expect(await service.listContacts()).toEqual([
      expect.objectContaining({
        name: "Claire Martin",
        company: "Atelier Lumen",
        email: "claire@lumen.fr",
        phone: "06 12 34 56 78",
      }),
    ]);
  });

  it("nettoie les espaces et enregistre les champs facultatifs vides comme absents", async () => {
    const repository = fakeRepository();
    const service = createContactService(repository);

    await service.addContact({ name: "  Claire  ", company: " ", email: "", phone: undefined });

    expect(repository.insert).toHaveBeenCalledWith({ name: "Claire", company: null, email: null, phone: null });
  });

  // Critère 2 : nom vide, « Le nom est obligatoire », rien n'est enregistré.
  it.each(["", "   ", undefined])("refuse un nom vide (%j) sans rien enregistrer", async (name) => {
    const repository = fakeRepository();
    const service = createContactService(repository);

    const result = await service.addContact({ name, email: "claire@lumen.fr" });

    expect(result).toEqual({ ok: false, errors: { name: "Le nom est obligatoire" } });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  // Critère 3 : e-mail mal formé, « L'e-mail n'est pas valide », rien n'est enregistré.
  it.each(["claire", "claire@", "claire@lumen", "@lumen.fr", "claire @lumen.fr"])(
    "refuse l'e-mail mal formé %j sans rien enregistrer",
    async (email) => {
      const repository = fakeRepository();
      const service = createContactService(repository);

      const result = await service.addContact({ name: "Claire", email });

      expect(result).toEqual({ ok: false, errors: { email: "L'e-mail n'est pas valide" } });
      expect(repository.insert).not.toHaveBeenCalled();
    },
  );

  it("signale toutes les erreurs à la fois", async () => {
    const service = createContactService(fakeRepository());

    const result = await service.addContact({ name: "", email: "faux" });

    expect(result).toEqual({
      ok: false,
      errors: { name: "Le nom est obligatoire", email: "L'e-mail n'est pas valide" },
    });
  });
});
