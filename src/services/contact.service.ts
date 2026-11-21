import {
  createContactRepository,
  type Contact,
  type ContactRepository,
  type NewContact,
} from "@/data/contact.repository";
import { z } from "zod";
import { parisToday } from "./today";
import { allowedMoves, FIRST_STAGE, MOVES, STAGES, targetStage, type AllowedMoves, type Move, type Stage } from "./stages";

export type { Contact };

export { STAGES, type Move, type Stage } from "./stages";

export type BoardColumn = { stage: Stage; label: string; count: number; contacts: Contact[]; moves: AllowedMoves };

export type Board = { columns: BoardColumn[]; total: number };

export type ContactErrors = { name?: string; email?: string };

export type MoveResult = { ok: true; contact: Contact } | { ok: false; error: string };

const moveSchema = z.enum(MOVES);

export type FollowUpInput = { date?: string };

export type FollowUpResult = { ok: true; contact: Contact } | { ok: false; error: string };

// Un contact à relancer : sa relance est aujourd'hui (à Paris) ou en retard.
export type FollowUp = { contact: Contact; overdue: boolean };

const followUpSchema = z.object({ date: z.iso.date({ error: "La date n'est pas valide" }) });

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

// now : l'horloge, remplacée dans les tests pour fixer « aujourd'hui ».
export function createContactService(repository: ContactRepository, now: () => Date = () => new Date()) {
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

    async setFollowUp(id: string, input: FollowUpInput): Promise<FollowUpResult> {
      const parsed = followUpSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: "La date n'est pas valide" };

      // Une nouvelle date remplace l'ancienne et met fin à l'attente de réponse.
      const contact = await repository.updateFollowUp(id, { date: parsed.data.date, awaitingReply: false });
      return contact ? { ok: true, contact } : { ok: false, error: "Contact introuvable" };
    },

    // Relance faite : le contact attend une réponse, garde sa date et reste dans sa colonne.
    async markFollowUpDone(id: string): Promise<FollowUpResult> {
      const contact = await repository.findById(id);
      if (!contact) return { ok: false, error: "Contact introuvable" };
      if (!contact.followUpOn) return { ok: false, error: "Aucune relance à marquer comme faite" };

      const updated = await repository.updateFollowUp(id, { date: contact.followUpOn, awaitingReply: true });
      return updated ? { ok: true, contact: updated } : { ok: false, error: "Contact introuvable" };
    },

    // Relances dues aujourd'hui ou en retard, de la plus ancienne à la plus récente (hors attente de réponse).
    async getFollowUps(): Promise<FollowUp[]> {
      const today = parisToday(now());
      const contacts = await repository.findAll();
      return contacts
        .filter(
          (contact): contact is Contact & { followUpOn: string } =>
            !contact.awaitingReply && !!contact.followUpOn && contact.followUpOn <= today,
        )
        .sort((a, b) => a.followUpOn.localeCompare(b.followUpOn))
        .map((contact) => ({ contact, overdue: contact.followUpOn < today }));
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;

export function getContactService(): ContactService {
  return createContactService(createContactRepository());
}
