// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted : les simulations doivent exister avant les vi.mock, remontés en haut du fichier.
const { addContact, moveContact, reopenContact, dropContact, setFollowUp, markFollowUpDone, updateContact, deleteContact, refresh } = vi.hoisted(() => ({
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  addContact: vi.fn(),
  moveContact: vi.fn(),
  reopenContact: vi.fn(),
  dropContact: vi.fn(),
  setFollowUp: vi.fn(),
  markFollowUpDone: vi.fn(),
  refresh: vi.fn(),
}));
// #32 : la limite d'appels et l'adresse du client, simulées.
const { check, requestHeaders } = vi.hoisted(() => ({
  check: vi.fn<(key: string) => Promise<{ ok: true } | { ok: false; error: string }>>(async () => ({ ok: true })),
  requestHeaders: new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
}));
vi.mock("@/services/rate-limit.service", () => ({ getRateLimitService: () => ({ check }) }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

vi.mock("@/services/contact.service", () => ({
  getContactService: () => ({ addContact, moveContact, reopenContact, dropContact, setFollowUp, markFollowUpDone, updateContact, deleteContact }),
}));
vi.mock("next/cache", () => ({ refresh }));

import {
  addContactAction,
  deleteContactAction,
  dropContactAction,
  markFollowUpDoneAction,
  moveContactAction,
  reopenContactAction,
  setFollowUpAction,
  updateContactAction,
} from "./contact.action";

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

  // Panne de la base : un message exploitable, la saisie gardée, pas de page d'erreur.
  it("renvoie un message et la saisie quand l'enregistrement échoue", async () => {
    addContact.mockRejectedValue(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await addContactAction({}, formData(saisie));

    expect(state).toEqual({
      formError: "Impossible d'enregistrer le contact, réessaie.",
      values: saisie,
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("couche présentation · moveContactAction (lot 3)", () => {
  beforeEach(() => {
    moveContact.mockReset();
    refresh.mockReset();
  });

  // Critères 1 à 3 : le déplacement passe par le service, puis la page est rafraîchie.
  it("passe le déplacement au service et rafraîchit la page quand il réussit", async () => {
    moveContact.mockResolvedValue({ ok: true, contact: { id: "1", stage: "contacte" } });

    expect(await moveContactAction("1", "next")).toEqual({});
    expect(moveContact).toHaveBeenCalledWith("1", "next");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie l'erreur du service sans rafraîchir", async () => {
    moveContact.mockResolvedValue({ ok: false, error: "Ce déplacement n'est pas possible" });

    expect(await moveContactAction("1", "next")).toEqual({ error: "Ce déplacement n'est pas possible" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renvoie un message quand la base est en panne", async () => {
    moveContact.mockRejectedValue(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await moveContactAction("1", "next")).toEqual({ error: "Impossible de déplacer le contact, réessaie." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

// #15 : rouvrir un contact Gagné ou Perdu passe par le service, comme un déplacement.
describe("couche présentation · reopenContactAction", () => {
  beforeEach(() => {
    reopenContact.mockReset();
    refresh.mockReset();
  });

  it("passe l'étape choisie au service et rafraîchit la page quand il réussit", async () => {
    reopenContact.mockResolvedValue({ ok: true, contact: { id: "1", stage: "rdv" } });

    expect(await reopenContactAction("1", "rdv")).toEqual({});
    expect(reopenContact).toHaveBeenCalledWith("1", "rdv");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie l'erreur du service sans rafraîchir", async () => {
    reopenContact.mockResolvedValue({ ok: false, error: "Ce déplacement n'est pas possible" });

    expect(await reopenContactAction("1", "gagne")).toEqual({ error: "Ce déplacement n'est pas possible" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renvoie un message quand la base est en panne", async () => {
    reopenContact.mockRejectedValue(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await reopenContactAction("1", "rdv")).toEqual({ error: "Impossible de rouvrir le contact, réessaie." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

// Lot 8 : un dépôt sur le kanban passe par le service, puis la page est rafraîchie.
describe("couche présentation · dropContactAction (lot 8)", () => {
  beforeEach(() => {
    dropContact.mockReset();
    refresh.mockReset();
  });

  it("passe la colonne d'arrivée au service et rafraîchit la page quand il réussit", async () => {
    dropContact.mockResolvedValue({ ok: true, contact: { id: "1", stage: "contacte" } });

    expect(await dropContactAction("1", "contacte")).toEqual({});
    expect(dropContact).toHaveBeenCalledWith("1", "contacte");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie l'erreur du service sans rafraîchir", async () => {
    dropContact.mockResolvedValue({ ok: false, error: "Ce déplacement n'est pas possible" });

    expect(await dropContactAction("1", "rdv")).toEqual({ error: "Ce déplacement n'est pas possible" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renvoie un message quand la base est en panne", async () => {
    dropContact.mockRejectedValue(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await dropContactAction("1", "contacte")).toEqual({ error: "Impossible de déplacer le contact, réessaie." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("couche présentation · setFollowUpAction (lot 4)", () => {
  beforeEach(() => {
    setFollowUp.mockReset();
    refresh.mockReset();
  });

  // Critère 1 : la date part au service, puis la page est rafraîchie.
  it("passe la date au service et rafraîchit la page", async () => {
    setFollowUp.mockResolvedValue({ ok: true, contact: { id: "1" } });

    expect(await setFollowUpAction({}, formData({ contactId: "1", date: "2026-11-21" }))).toEqual({});
    expect(setFollowUp).toHaveBeenCalledWith("1", { date: "2026-11-21" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie l'erreur du service sans rafraîchir", async () => {
    setFollowUp.mockResolvedValue({ ok: false, error: "La date n'est pas valide" });

    expect(await setFollowUpAction({}, formData({ contactId: "1", date: "" }))).toEqual({
      error: "La date n'est pas valide",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renvoie un message quand la base est en panne", async () => {
    setFollowUp.mockRejectedValue(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await setFollowUpAction({}, formData({ contactId: "1", date: "2026-11-21" }))).toEqual({
      error: "Impossible d'enregistrer la relance, réessaie.",
    });
  });
});

describe("couche présentation · markFollowUpDoneAction (lot 5)", () => {
  beforeEach(() => {
    markFollowUpDone.mockReset();
    refresh.mockReset();
  });

  // Critère 1 : la relance faite passe par le service, puis la page est rafraîchie.
  it("passe le contact au service et rafraîchit la page", async () => {
    markFollowUpDone.mockResolvedValue({ ok: true, contact: { id: "1" } });

    expect(await markFollowUpDoneAction("1")).toEqual({});
    expect(markFollowUpDone).toHaveBeenCalledWith("1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie l'erreur du service, ou un message si la base est en panne", async () => {
    markFollowUpDone.mockResolvedValueOnce({ ok: false, error: "Contact introuvable" });
    expect(await markFollowUpDoneAction("1")).toEqual({ error: "Contact introuvable" });

    markFollowUpDone.mockRejectedValueOnce(new Error("SQLITE_BUSY"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await markFollowUpDoneAction("1")).toEqual({ error: "Impossible d'enregistrer la relance, réessaie." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("couche présentation · updateContactAction et deleteContactAction (lot 6)", () => {
  beforeEach(() => {
    updateContact.mockReset();
    deleteContact.mockReset();
    refresh.mockReset();
  });

  // Critère 1 : la modification passe par le service, puis la page est rafraîchie.
  it("passe la modification au service, rafraîchit la page et signale l'enregistrement", async () => {
    updateContact.mockResolvedValue({ ok: true, contact: { id: "1" } });

    const state = await updateContactAction({}, formData({ contactId: "1", ...saisie, company: "Studio Nord" }));

    expect(updateContact).toHaveBeenCalledWith("1", { ...saisie, company: "Studio Nord" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ saved: true });
  });

  // Critère 2 : nom vide, les erreurs reviennent au formulaire avec la saisie.
  it("renvoie les erreurs et la saisie sans rafraîchir", async () => {
    updateContact.mockResolvedValue({ ok: false, errors: { name: "Le nom est obligatoire" } });

    const state = await updateContactAction({}, formData({ contactId: "1", ...saisie, name: "" }));

    expect(state).toEqual({ errors: { name: "Le nom est obligatoire" }, values: { ...saisie, name: "" } });
    expect(refresh).not.toHaveBeenCalled();
  });

  // Critère 3 : la suppression passe par le service, puis la page est rafraîchie.
  it("supprime via le service et rafraîchit la page", async () => {
    deleteContact.mockResolvedValue({ ok: true });

    expect(await deleteContactAction("1")).toEqual({});
    expect(deleteContact).toHaveBeenCalledWith("1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renvoie un message quand la base est en panne", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    updateContact.mockRejectedValue(new Error("SQLITE_BUSY"));
    deleteContact.mockRejectedValue(new Error("SQLITE_BUSY"));

    expect(await updateContactAction({}, formData({ contactId: "1", ...saisie }))).toEqual({
      formError: "Impossible d'enregistrer le contact, réessaie.",
      values: saisie,
    });
    expect(await deleteContactAction("1")).toEqual({ error: "Impossible de supprimer le contact, réessaie." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

// #32 : trop d'appels depuis la même adresse → rien n'est enregistré, un message l'explique.
describe("couche présentation · actions · limite d'appels (#32)", () => {
  const TOO_MANY = "Trop de modifications d'un coup. Attends une minute et réessaie.";
  const ID = "00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    check.mockResolvedValue({ ok: true });
  });

  it("compte les appels par adresse IP du client (la première de x-forwarded-for)", async () => {
    addContact.mockResolvedValue({ ok: true, contact: {} });

    await addContactAction({}, formData(saisie));

    expect(check).toHaveBeenCalledWith("write:203.0.113.7");
  });

  it("refuse l'ajout au-delà de la limite et garde la saisie", async () => {
    check.mockResolvedValue({ ok: false, error: TOO_MANY });

    expect(await addContactAction({}, formData(saisie))).toEqual({ formError: TOO_MANY, values: saisie });
    expect(addContact).not.toHaveBeenCalled();
  });

  it("refuse la modification au-delà de la limite", async () => {
    check.mockResolvedValue({ ok: false, error: TOO_MANY });

    const result = await updateContactAction({}, formData({ ...saisie, contactId: ID }));

    expect(result.formError).toBe(TOO_MANY);
    expect(updateContact).not.toHaveBeenCalled();
  });

  it.each([
    ["deleteContactAction", () => deleteContactAction(ID), deleteContact],
    ["moveContactAction", () => moveContactAction(ID, "next"), moveContact],
    ["reopenContactAction", () => reopenContactAction(ID, "rdv"), reopenContact],
    ["dropContactAction", () => dropContactAction(ID, "rdv"), dropContact],
    ["setFollowUpAction", () => setFollowUpAction({}, formData({ contactId: ID, date: "2026-11-30" })), setFollowUp],
    ["markFollowUpDoneAction", () => markFollowUpDoneAction(ID), markFollowUpDone],
  ] as const)("%s refuse au-delà de la limite, sans appeler le service", async (_name, call, serviceMethod) => {
    check.mockResolvedValue({ ok: false, error: TOO_MANY });

    expect(await call()).toEqual({ error: TOO_MANY });
    expect(serviceMethod).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("laisse passer si le compteur est en panne (la base répondra elle-même)", async () => {
    check.mockRejectedValue(new Error("base injoignable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    moveContact.mockResolvedValue({ ok: true, contact: {} });

    expect(await moveContactAction(ID, "next")).toEqual({});
    expect(moveContact).toHaveBeenCalled();
  });
});
