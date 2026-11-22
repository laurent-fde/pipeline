"use server";

import { refresh } from "next/cache";
import { getContactService, type ContactErrors, type ContactInput, type Move, type Stage } from "@/services/contact.service";

export type ContactFormState = {
  errors?: ContactErrors;
  formError?: string;
  values?: ContactInput;
  // Modification enregistrée : le formulaire de modification peut se refermer.
  saved?: boolean;
};

const FIELDS = ["name", "company", "email", "phone"] as const;

function readContactInput(formData: FormData): ContactInput {
  const values: ContactInput = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

export async function addContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values = readContactInput(formData);

  let result;
  try {
    result = await getContactService().addContact(values);
  } catch (error) {
    // Panne de la base (SQLite, Turso) : on la journalise côté serveur, l'utilisateur garde sa saisie.
    console.error("addContactAction", error);
    return { formError: "Impossible d'enregistrer le contact, réessaie.", values };
  }
  if (!result.ok) return { errors: result.errors, values };

  refresh();
  return {};
}

export async function updateContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const contactId = String(formData.get("contactId") ?? "");
  const values = readContactInput(formData);

  let result;
  try {
    result = await getContactService().updateContact(contactId, values);
  } catch (error) {
    console.error("updateContactAction", error);
    return { formError: "Impossible d'enregistrer le contact, réessaie.", values };
  }
  if (!result.ok) return { errors: result.errors, formError: result.error, values };

  refresh();
  return { saved: true };
}

export async function deleteContactAction(id: string): Promise<{ error?: string }> {
  let result;
  try {
    result = await getContactService().deleteContact(id);
  } catch (error) {
    console.error("deleteContactAction", error);
    return { error: "Impossible de supprimer le contact, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}

export type MoveState = { error?: string };

export async function moveContactAction(id: string, move: Move): Promise<MoveState> {
  let result;
  try {
    result = await getContactService().moveContact(id, move);
  } catch (error) {
    console.error("moveContactAction", error);
    return { error: "Impossible de déplacer le contact, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}

export async function reopenContactAction(id: string, stage: Stage): Promise<MoveState> {
  let result;
  try {
    result = await getContactService().reopenContact(id, stage);
  } catch (error) {
    console.error("reopenContactAction", error);
    return { error: "Impossible de rouvrir le contact, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}

// Lot 8 : une carte déposée sur une colonne du kanban.
export async function dropContactAction(id: string, stage: Stage): Promise<MoveState> {
  let result;
  try {
    result = await getContactService().dropContact(id, stage);
  } catch (error) {
    console.error("dropContactAction", error);
    return { error: "Impossible de déplacer le contact, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}

export type FollowUpState = { error?: string };

export async function setFollowUpAction(_prev: FollowUpState, formData: FormData): Promise<FollowUpState> {
  const contactId = formData.get("contactId");
  const date = formData.get("date");

  let result;
  try {
    result = await getContactService().setFollowUp(String(contactId ?? ""), {
      date: typeof date === "string" ? date : undefined,
    });
  } catch (error) {
    console.error("setFollowUpAction", error);
    return { error: "Impossible d'enregistrer la relance, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}

export async function markFollowUpDoneAction(id: string): Promise<FollowUpState> {
  let result;
  try {
    result = await getContactService().markFollowUpDone(id);
  } catch (error) {
    console.error("markFollowUpDoneAction", error);
    return { error: "Impossible d'enregistrer la relance, réessaie." };
  }
  if (!result.ok) return { error: result.error };

  refresh();
  return {};
}
