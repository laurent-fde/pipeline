import {
  createContactRepository,
  type Contact,
  type ContactRepository,
  type NewContact,
} from "@/data/contact.repository";
import { z } from "zod";

export type { Contact };

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

// Texte facultatif : espaces retirés, vide ou absent enregistré comme null.
const optionalText = z.string().trim().optional().transform((value) => value || null);

// Règles métier d'un contact, en un seul schéma : réutilisé pour l'ajout (lot 1) et la modification (lot 6).
export const contactSchema = z.object({
  name: z.string({ error: "Le nom est obligatoire" }).trim().min(1, { error: "Le nom est obligatoire" }),
  company: optionalText,
  email: optionalText.pipe(z.email({ error: "L'e-mail n'est pas valide" }).nullable()),
  phone: optionalText,
});

// Ce que le service accepte de recevoir : tout est facultatif, c'est le schéma qui décide.
export type ContactInput = { name?: string; company?: string; email?: string; phone?: string };

// safeParse et non parse : une saisie refusée n'est pas une panne, on renvoie les erreurs.
export function validateContactInput(
  input: ContactInput,
): { ok: true; value: Omit<NewContact, "stage"> } | { ok: false; errors: ContactErrors } {
  const result = contactSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  const { fieldErrors } = z.flattenError(result.error);
  const errors: ContactErrors = {};
  if (fieldErrors.name) errors.name = fieldErrors.name[0];
  if (fieldErrors.email) errors.email = fieldErrors.email[0];
  return { ok: false, errors };
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
