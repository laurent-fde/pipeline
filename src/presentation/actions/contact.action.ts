"use server";

import { refresh } from "next/cache";
import { getContactService, type ContactErrors, type ContactInput, type Move } from "@/services/contact.service";

export type ContactFormState = {
  errors?: ContactErrors;
  formError?: string;
  values?: ContactInput;
};

const FIELDS = ["name", "company", "email", "phone"] as const;

export async function addContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values: ContactInput = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }

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
