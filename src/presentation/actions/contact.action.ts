"use server";

import { refresh } from "next/cache";
import { getContactService, type ContactErrors, type ContactInput } from "@/services/contact.service";

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
