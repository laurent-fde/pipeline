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
  followUpOn: null,
  awaitingReply: false,
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
  ])("ramène un contact de %s à %s", async (from, to) => {
    const { service } = serviceWith(from);

    const result = await service.moveContact("1", "previous");

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ stage: to }) });
  });

  it.each(["nouveau", "gagne", "perdu"])("refuse « Étape précédente » depuis %s, sans rien enregistrer", async (from) => {
    const { repository, service } = serviceWith(from);

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
      gagne: { previous: false, next: false, lost: true },
      perdu: { previous: false, next: false, lost: false },
    });
  });

  // Remarque sur #3 : un contact Gagné ou Perdu peut être rouvert, à une étape choisie à la main.
  it("propose de rouvrir vers Nouveau, Contacté, RDV ou Proposition, seulement depuis Gagné ou Perdu", async () => {
    const board = await createContactService(fakeRepository()).getBoard();
    const open = [
      { stage: "nouveau", label: "Nouveau" },
      { stage: "contacte", label: "Contacté" },
      { stage: "rdv", label: "RDV" },
      { stage: "proposition", label: "Proposition" },
    ];

    expect(Object.fromEntries(board.columns.map((c) => [c.stage, c.reopenTargets]))).toEqual({
      nouveau: [],
      contacte: [],
      rdv: [],
      proposition: [],
      gagne: open,
      perdu: open,
    });
  });

  it.each([
    ["perdu", "rdv"],
    ["perdu", "nouveau"],
    ["gagne", "proposition"],
  ])("rouvre un contact de %s vers %s", async (from, to) => {
    const { repository, service } = serviceWith(from);

    const result = await service.reopenContact("1", to as never);

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ stage: to }) });
    expect(repository.updateStage).toHaveBeenCalledWith("1", to);
  });

  it.each([
    ["rdv", "nouveau"],
    ["perdu", "gagne"],
    ["gagne", "perdu"],
    ["perdu", "inconnue"],
  ])("refuse de rouvrir un contact de %s vers %s, sans rien enregistrer", async (from, to) => {
    const { repository, service } = serviceWith(from);

    const result = await service.reopenContact("1", to as never);

    expect(result).toEqual({ ok: false, error: "Ce déplacement n'est pas possible" });
    expect(repository.updateStage).not.toHaveBeenCalled();
  });

  it("refuse de rouvrir un contact inconnu", async () => {
    const { service } = serviceWith("perdu");

    expect(await service.reopenContact("inconnu", "rdv")).toEqual({ ok: false, error: "Contact introuvable" });
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

describe("couche service · contact.service · relances (lot 4)", () => {
  // Le 21 novembre 2026 à 10 h, heure de Paris.
  const now = () => new Date("2026-11-21T09:00:00Z");
  const serviceWith = (contacts: Contact[]) => {
    const repository = fakeRepository(contacts);
    return { repository, service: createContactService(repository, now) };
  };

  // Critère 1 : une relance fixée à aujourd'hui fait apparaître le contact dans « À relancer ».
  it("fixe une relance à aujourd'hui et range le contact dans « À relancer »", async () => {
    const { repository, service } = serviceWith([aContact({ id: "1", name: "Claire Martin" })]);

    const result = await service.setFollowUp("1", { date: "2026-11-21" });

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ followUpOn: "2026-11-21" }) });
    expect(repository.updateFollowUp).toHaveBeenCalledWith("1", { date: "2026-11-21", awaitingReply: false });
    expect(await service.getFollowUps()).toEqual([
      { contact: expect.objectContaining({ name: "Claire Martin" }), overdue: false },
    ]);
  });

  // Critère 2 : une relance à une date passée apparaît, indiquée en retard.
  it("indique en retard une relance à une date passée", async () => {
    const { service } = serviceWith([aContact({ id: "1", followUpOn: "2026-11-18" })]);

    expect(await service.getFollowUps()).toEqual([{ contact: expect.objectContaining({ id: "1" }), overdue: true }]);
  });

  // Critère 3 : une relance à une date future n'apparaît pas.
  it("n'affiche pas une relance à une date future", async () => {
    const { service } = serviceWith([aContact({ id: "1", followUpOn: "2026-11-22" })]);

    expect(await service.getFollowUps()).toEqual([]);
  });

  // Critère 4 : aucune relance due, la liste est vide (la présentation affiche le message).
  it("renvoie une liste vide quand aucune relance n'est due", async () => {
    const { service } = serviceWith([aContact({ id: "1" }), aContact({ id: "2", followUpOn: "2026-12-01" })]);

    expect(await service.getFollowUps()).toEqual([]);
  });

  it("calcule « aujourd'hui » à l'heure de Paris, pas en UTC", async () => {
    // 21 novembre 23 h 30 UTC = 22 novembre 0 h 30 à Paris.
    const repository = fakeRepository([aContact({ id: "1", followUpOn: "2026-11-22" })]);
    const service = createContactService(repository, () => new Date("2026-11-21T23:30:00Z"));

    expect(await service.getFollowUps()).toEqual([{ contact: expect.objectContaining({ id: "1" }), overdue: false }]);
  });

  it("trie les relances de la plus ancienne à la plus récente", async () => {
    const { service } = serviceWith([
      aContact({ id: "1", followUpOn: "2026-11-21" }),
      aContact({ id: "2", followUpOn: "2026-11-10" }),
      aContact({ id: "3", followUpOn: "2026-11-15" }),
    ]);

    expect((await service.getFollowUps()).map((f) => f.contact.id)).toEqual(["2", "3", "1"]);
  });

  it.each(["", "21/11/2026", "2026-02-30", undefined])("refuse la date %j sans rien enregistrer", async (date) => {
    const { repository, service } = serviceWith([aContact({ id: "1" })]);

    expect(await service.setFollowUp("1", { date })).toEqual({ ok: false, error: "La date n'est pas valide" });
    expect(repository.updateFollowUp).not.toHaveBeenCalled();
  });

  it("refuse un contact inconnu", async () => {
    const { service } = serviceWith([]);

    expect(await service.setFollowUp("inconnu", { date: "2026-11-21" })).toEqual({
      ok: false,
      error: "Contact introuvable",
    });
  });
});

describe("couche service · contact.service · relance faite (lot 5)", () => {
  const now = () => new Date("2026-11-21T09:00:00Z");
  const serviceWith = (contacts: Contact[]) => {
    const repository = fakeRepository(contacts);
    return { repository, service: createContactService(repository, now) };
  };

  // Critère 1 : « Relance faite » sort le contact de « À relancer ».
  it("sort de « À relancer » un contact dont la relance est faite", async () => {
    const { repository, service } = serviceWith([aContact({ id: "1", followUpOn: "2026-11-21" })]);

    const result = await service.markFollowUpDone("1");

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ awaitingReply: true }) });
    expect(repository.updateFollowUp).toHaveBeenCalledWith("1", { date: "2026-11-21", awaitingReply: true });
    expect(await service.getFollowUps()).toEqual([]);
  });

  // Critère 2 : le contact est « En attente de réponse » et reste dans sa colonne.
  it("laisse le contact dans sa colonne, en attente de réponse", async () => {
    const { service } = serviceWith([aContact({ id: "1", stage: "rdv", followUpOn: "2026-11-18" })]);

    await service.markFollowUpDone("1");

    const rdv = (await service.getBoard()).columns.find((c) => c.stage === "rdv");
    expect(rdv?.contacts).toEqual([expect.objectContaining({ id: "1", awaitingReply: true })]);
  });

  // Critère 3 : une nouvelle date retire l'attente et remplace l'ancienne date.
  it("retire l'attente et remplace la date quand je fixe une nouvelle relance", async () => {
    const { service } = serviceWith([aContact({ id: "1", followUpOn: "2026-11-18", awaitingReply: true })]);

    const result = await service.setFollowUp("1", { date: "2026-11-21" });

    expect(result).toEqual({
      ok: true,
      contact: expect.objectContaining({ followUpOn: "2026-11-21", awaitingReply: false }),
    });
    expect(await service.getFollowUps()).toEqual([{ contact: expect.objectContaining({ id: "1" }), overdue: false }]);
  });

  it("refuse de marquer faite une relance absente, ou un contact inconnu", async () => {
    const { repository, service } = serviceWith([aContact({ id: "1" })]);

    expect(await service.markFollowUpDone("1")).toEqual({ ok: false, error: "Aucune relance à marquer comme faite" });
    expect(await service.markFollowUpDone("inconnu")).toEqual({ ok: false, error: "Contact introuvable" });
    expect(repository.updateFollowUp).not.toHaveBeenCalled();
  });
});

describe("couche service · contact.service · modifier ou supprimer (lot 6)", () => {
  const now = () => new Date("2026-11-21T09:00:00Z");
  const claire = aContact({ id: "1", name: "Claire Martin", company: "Atelier Lumen", stage: "rdv", followUpOn: "2026-11-21" });
  const serviceWith = (contacts: Contact[]) => {
    const repository = fakeRepository(contacts);
    return { repository, service: createContactService(repository, now) };
  };

  // Critère 1 : je modifie l'entreprise, la carte affiche la nouvelle valeur.
  it("enregistre la nouvelle entreprise, sans toucher à l'étape ni à la relance", async () => {
    const { repository, service } = serviceWith([claire]);

    const result = await service.updateContact("1", { name: "Claire Martin", company: "Studio Nord" });

    expect(result).toEqual({ ok: true, contact: expect.objectContaining({ company: "Studio Nord", stage: "rdv" }) });
    expect(repository.update).toHaveBeenCalledWith("1", {
      name: "Claire Martin",
      company: "Studio Nord",
      email: null,
      phone: null,
    });
    const rdv = (await service.getBoard()).columns.find((c) => c.stage === "rdv");
    expect(rdv?.contacts).toEqual([expect.objectContaining({ company: "Studio Nord", followUpOn: "2026-11-21" })]);
  });

  // Critère 2 : nom vide, « Le nom est obligatoire », rien ne change.
  it("refuse un nom vide sans rien enregistrer", async () => {
    const { repository, service } = serviceWith([claire]);

    const result = await service.updateContact("1", { name: "  ", company: "Studio Nord" });

    expect(result).toEqual({ ok: false, errors: { name: "Le nom est obligatoire" } });
    expect(repository.update).not.toHaveBeenCalled();
    expect((await service.listContacts())[0].company).toBe("Atelier Lumen");
  });

  it("refuse de modifier un contact inconnu", async () => {
    const { service } = serviceWith([]);

    expect(await service.updateContact("inconnu", { name: "Claire" })).toEqual({
      ok: false,
      errors: {},
      error: "Contact introuvable",
    });
  });

  // Critère 3 : après suppression, le contact disparaît du tableau et de « À relancer ».
  it("supprime le contact du tableau et de « À relancer »", async () => {
    const { service } = serviceWith([claire]);
    expect(await service.getFollowUps()).toHaveLength(1);

    expect(await service.deleteContact("1")).toEqual({ ok: true });

    expect((await service.getBoard()).total).toBe(0);
    expect(await service.getFollowUps()).toEqual([]);
  });

  it("refuse de supprimer un contact inconnu", async () => {
    const { service } = serviceWith([]);

    expect(await service.deleteContact("inconnu")).toEqual({ ok: false, error: "Contact introuvable" });
  });
});

