import {
  createContactRepository,
  type Contact,
  type ContactRepository,
  type NewContact,
} from "@/data/contact.repository";
import { z } from "zod";
import { allowedMoves, FIRST_STAGE, MOVES, STAGES, targetStage, type AllowedMoves, type Move, type Stage } from "./stages";

export type { Contact };

export { STAGES, type Move, type Stage } from "./stages";

export type BoardColumn = { stage: Stage; label: string; count: number; contacts: Contact[]; moves: AllowedMoves };

export type Board = { columns: BoardColumn[]; total: number };

export type ContactErrors = { name?: string; email?: string };

export type MoveResult = { ok: true; contact: Contact } | { ok: false; error: string };

const moveSchema = z.enum(MOVES);

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
        return { stage: id, label, count: inColumn.length, contacts: inColumn, moves: allowedMoves(id) };
      });
      return { columns, total: contacts.length };
    },

    // Étape suivante, précédente ou Perdu : la règle décide, la couche données enregistre.
    async moveContact(id: string, move: Move): Promise<MoveResult> {
      const parsedMove = moveSchema.safeParse(move);
      if (!parsedMove.success) return { ok: false, error: "Ce déplacement n'est pas possible" };

      const contact = await repository.findById(id);
      if (!contact) return { ok: false, error: "Contact introuvable" };

      const stage = targetStage(contact.stage, parsedMove.data);
      if (!stage) return { ok: false, error: "Ce déplacement n'est pas possible" };

      const moved = await repository.updateStage(id, stage);
      return moved ? { ok: true, contact: moved } : { ok: false, error: "Contact introuvable" };
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;

export function getContactService(): ContactService {
  return createContactService(createContactRepository());
}
