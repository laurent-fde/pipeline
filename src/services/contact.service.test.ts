// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Contact, ContactRepository, NewContact } from "@/data/contact.repository";
import { createContactService, STAGES } from "./contact.service";

// Fausse couche données : un tableau en mémoire, jamais une vraie base.
function fakeRepository(initial: Contact[] = []) {
  const contacts: Contact[] = [...initial];
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

    expect(repository.insert).toHaveBeenCalledWith({
      name: "Claire",
      company: null,
      email: null,
      phone: null,
      stage: "nouveau",
    });
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

const contact = (id: string, stage: string): Contact => ({
  id,
  name: `Contact ${id}`,
  company: null,
  email: null,
  phone: null,
  stage,
  createdAt: "2026-11-20T10:00:00.000Z",
});

describe("couche service · contact.service · tableau kanban (lot 2)", () => {
  // Critère 1 : les colonnes Nouveau, Contacté, RDV, Proposition, Gagné, Perdu, dans cet ordre.
  it("renvoie les six étapes dans l'ordre, même sans contact", async () => {
    const board = await createContactService(fakeRepository()).getBoard();

    expect(board.columns.map((c) => c.label)).toEqual(["Nouveau", "Contacté", "RDV", "Proposition", "Gagné", "Perdu"]);
    expect(board.columns.map((c) => c.stage)).toEqual(STAGES.map((s) => s.id));
  });

  // Critère 2 : un contact que je viens d'ajouter est dans la colonne Nouveau.
  it("enregistre un nouveau contact à l'étape « nouveau » et le range dans Nouveau", async () => {
    const repository = fakeRepository();
    const service = createContactService(repository);

    await service.addContact({ name: "Claire Martin" });

    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({ stage: "nouveau" }));
    const board = await service.getBoard();
    expect(board.columns[0].contacts.map((c) => c.name)).toEqual(["Claire Martin"]);
  });

  // Critère 3 : chaque colonne indique son nombre de contacts.
  it("compte les contacts de chaque colonne", async () => {
    const service = createContactService(
      fakeRepository([contact("1", "nouveau"), contact("2", "rdv"), contact("3", "nouveau")]),
    );

    const board = await service.getBoard();

    expect(Object.fromEntries(board.columns.map((c) => [c.stage, c.count]))).toEqual({
      nouveau: 2,
      contacte: 0,
      rdv: 1,
      proposition: 0,
      gagne: 0,
      perdu: 0,
    });
    expect(board.columns[0].contacts.map((c) => c.id)).toEqual(["1", "3"]);
    expect(board.total).toBe(3);
  });

  // Critère 4 : aucun contact, le tableau est vide (la présentation affiche alors l'invitation).
  it("indique un total de zéro quand il n'y a aucun contact", async () => {
    const board = await createContactService(fakeRepository()).getBoard();

    expect(board.total).toBe(0);
    expect(board.columns.every((c) => c.count === 0)).toBe(true);
  });
});
