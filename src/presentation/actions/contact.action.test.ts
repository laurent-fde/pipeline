// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted : les simulations doivent exister avant les vi.mock, remontés en haut du fichier.
const { addContact, moveContact, setFollowUp, markFollowUpDone, refresh } = vi.hoisted(() => ({
  addContact: vi.fn(),
  moveContact: vi.fn(),
  setFollowUp: vi.fn(),
  markFollowUpDone: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/services/contact.service", () => ({
  getContactService: () => ({ addContact, moveContact, setFollowUp, markFollowUpDone }),
}));
vi.mock("next/cache", () => ({ refresh }));

import { addContactAction, markFollowUpDoneAction, moveContactAction, setFollowUpAction } from "./contact.action";

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

