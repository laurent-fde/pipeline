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

// Les étapes du pipeline, dans l'ordre du tableau. « Perdu » est atteignable depuis n'importe quelle étape.
export const STAGES = [
  { id: "nouveau", label: "Nouveau" },
  { id: "contacte", label: "Contacté" },
  { id: "rdv", label: "RDV" },
  { id: "proposition", label: "Proposition" },
  { id: "gagne", label: "Gagné" },
  { id: "perdu", label: "Perdu" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

const FIRST_STAGE: Stage = "nouveau";

export type BoardColumn = { stage: Stage; label: string; count: number; contacts: Contact[] };

export type Board = { columns: BoardColumn[]; total: number };

export type ContactErrors = { name?: string; email?: string };

export type AddContactResult = { ok: true; contact: Contact } | { ok: false; errors: ContactErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value?: string) => value?.trim() || null;

// Règles métier d'un contact : réutilisées pour l'ajout (lot 1) et la modification (lot 6).
export function validateContactInput(
  input: ContactInput,
): { ok: true; value: Omit<NewContact, "stage"> } | { ok: false; errors: ContactErrors } {
  const value: Omit<NewContact, "stage"> = {
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
      // Un nouveau contact commence toujours à la première étape.
      return { ok: true, contact: await repository.insert({ ...result.value, stage: FIRST_STAGE }) };
    },

    listContacts(): Promise<Contact[]> {
      return repository.findAll();
    },

    // Une colonne par étape, toujours les six, même vides. L'ordre des contacts reçu est conservé.
    async getBoard(): Promise<Board> {
      const contacts = await repository.findAll();
      const columns = STAGES.map(({ id, label }) => {
        const inColumn = contacts.filter((contact) => contact.stage === id);
        return { stage: id, label, count: inColumn.length, contacts: inColumn };
      });
      return { columns, total: contacts.length };
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;

export function getContactService(): ContactService {
  return createContactService(createContactRepository());
}
