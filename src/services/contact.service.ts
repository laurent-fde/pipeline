import {
  createContactRepository,
  type Contact,
  type ContactRepository,
  type NewContact,
} from "@/data/contact.repository";

export type { Contact };

export type ContactInput = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type ContactErrors = { name?: string; email?: string };

export type AddContactResult = { ok: true; contact: Contact } | { ok: false; errors: ContactErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value?: string) => value?.trim() || null;

// Règles métier d'un contact : réutilisées pour l'ajout (lot 1) et la modification (lot 6).
export function validateContactInput(
  input: ContactInput,
): { ok: true; value: NewContact } | { ok: false; errors: ContactErrors } {
  const value: NewContact = {
    name: input.name?.trim() ?? "",
    company: clean(input.company),
    email: clean(input.email),
    phone: clean(input.phone),
  };

  const errors: ContactErrors = {};
  if (!value.name) errors.name = "Le nom est obligatoire";
  if (value.email && !EMAIL.test(value.email)) errors.email = "L'e-mail n'est pas valide";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function createContactService(repository: ContactRepository) {
  return {
    async addContact(input: ContactInput): Promise<AddContactResult> {
      const result = validateContactInput(input);
      if (!result.ok) return result;
      return { ok: true, contact: await repository.insert(result.value) };
    },

    listContacts(): Promise<Contact[]> {
      return repository.findAll();
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;

export function getContactService(): ContactService {
  return createContactService(createContactRepository());
}
