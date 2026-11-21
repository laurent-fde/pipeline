// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Contact } from "@/data/contact.repository";
import { createContactService, STAGES } from "./contact.service";
import { aContact, fakeContactRepository as fakeRepository } from "./testing/fake-contact-repository";

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

describe("couche service · contact.service · déplacer un contact (lot 3)", () => {
  const serviceWith = (stage: string) => {
    const repository = fakeRepository([aContact({ id: "1", stage })]);
    return { repository, service: createContactService(repository) };
  };

  // Critère 1 : « Étape suivante » fait passer le contact dans la colonne suivante.
  it.each([
    ["nouveau", "contacte"],
    ["contacte", "rdv"],
    ["rdv", "proposition"],
    ["proposition", "gagne"],
  ])("fait passer un contact de %s à %s", async (from, to) => {
    const { repository, service } = serviceWith(from);

    const result = await service.moveContact("1", "next");

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ stage: to }) });
    expect(repository.updateStage).toHaveBeenCalledWith("1", to);
  });

  // Critère 2 : « Étape précédente » ramène le contact dans la colonne précédente.
  it.each([
    ["contacte", "nouveau"],
    ["rdv", "contacte"],
    ["proposition", "rdv"],
    ["gagne", "proposition"],
    ["perdu", "gagne"],
  ])("ramène un contact de %s à %s", async (from, to) => {
    const { service } = serviceWith(from);

    const result = await service.moveContact("1", "previous");

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ stage: to }) });
  });

  it("refuse « Étape précédente » depuis Nouveau, sans rien enregistrer", async () => {
    const { repository, service } = serviceWith("nouveau");

    const result = await service.moveContact("1", "previous");

    expect(result).toEqual({ ok: false, error: "Ce déplacement n'est pas possible" });
    expect(repository.updateStage).not.toHaveBeenCalled();
  });

  // Critère 3 : « Marquer perdu » fait passer le contact dans Perdu, depuis n'importe quelle étape.
  it.each(["nouveau", "contacte", "rdv", "proposition", "gagne"])("marque perdu un contact à l'étape %s", async (from) => {
    const { service } = serviceWith(from);

    const result = await service.moveContact("1", "lost");

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ stage: "perdu" }) });
  });

  // Critère 4 : depuis Gagné ou Perdu, « Étape suivante » est indisponible.
  it.each(["gagne", "perdu"])("refuse « Étape suivante » depuis %s, sans rien enregistrer", async (from) => {
    const { repository, service } = serviceWith(from);

    const result = await service.moveContact("1", "next");

    expect(result).toEqual({ ok: false, error: "Ce déplacement n'est pas possible" });
    expect(repository.updateStage).not.toHaveBeenCalled();
  });

  it("indique dans le tableau les déplacements permis pour chaque colonne", async () => {
    const board = await createContactService(fakeRepository()).getBoard();

    expect(Object.fromEntries(board.columns.map((c) => [c.stage, c.moves]))).toEqual({
      nouveau: { previous: false, next: true, lost: true },
      contacte: { previous: true, next: true, lost: true },
      rdv: { previous: true, next: true, lost: true },
      proposition: { previous: true, next: true, lost: true },
      gagne: { previous: true, next: false, lost: true },
      perdu: { previous: true, next: false, lost: false },
    });
  });

  it("refuse un contact inconnu ou un déplacement inconnu", async () => {
    const { repository, service } = serviceWith("rdv");

    expect(await service.moveContact("inconnu", "next")).toEqual({ ok: false, error: "Contact introuvable" });
    expect(await service.moveContact("1", "sauter" as never)).toEqual({
      ok: false,
      error: "Ce déplacement n'est pas possible",
    });
    expect(repository.updateStage).not.toHaveBeenCalled();
  });
});
