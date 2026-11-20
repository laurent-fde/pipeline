"use server";

import { refresh } from "next/cache";
import { getContactService, type ContactErrors, type ContactInput } from "@/services/contact.service";

export type ContactFormState = {
  errors?: ContactErrors;
  values?: ContactInput;
};

const FIELDS = ["name", "company", "email", "phone"] as const;

export async function addContactAction(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values: ContactInput = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }

  const result = await getContactService().addContact(values);
  if (!result.ok) return { errors: result.errors, values };

  refresh();
  return {};
}
