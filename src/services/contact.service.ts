import {
  createContactRepository,
  type Contact,
  type ContactFields,
  type ContactRepository,
} from "@/data/contact.repository";
import { z } from "zod";
import { parisToday } from "./today";
import {
  allowedMoves,
  FIRST_STAGE,
  MOVES,
  reopenTargets,
  STAGES,
  targetStage,
  type AllowedMoves,
  type Move,
  type ReopenTarget,
  type Stage,
} from "./stages";

export type { Contact };

export { STAGES, type Move, type ReopenTarget, type Stage } from "./stages";

export type BoardColumn = {
  stage: Stage;
  label: string;
  count: number;
  contacts: Contact[];
  moves: AllowedMoves;
  reopenTargets: ReopenTarget[];
};

export type Board = { columns: BoardColumn[]; total: number };

export type ContactErrors = { name?: string; company?: string; email?: string; phone?: string };

export type UpdateContactResult =
  | { ok: true; contact: Contact }
  | { ok: false; errors: ContactErrors; error?: string };

export type DeleteContactResult = { ok: true } | { ok: false; error: string };

export type MoveResult = { ok: true; contact: Contact } | { ok: false; error: string };

const moveSchema = z.enum(MOVES);

// L'identifiant d'un contact vient du navigateur : la base n'en crée qu'au format UUID.
const idSchema = z.uuid();
const isContactId = (id: unknown): id is string => idSchema.safeParse(id).success;
const NOT_FOUND = "Contact introuvable";

const stageSchema = z.enum(STAGES.map((stage) => stage.id));

export type FollowUpInput = { date?: string };

export type FollowUpResult = { ok: true; contact: Contact } | { ok: false; error: string };

// Un contact à relancer : sa relance est aujourd'hui (à Paris) ou en retard.
export type FollowUp = { contact: Contact; overdue: boolean };

const followUpSchema = z.object({ date: z.iso.date({ error: "La date n'est pas valide" }) });

export type AddContactResult = { ok: true; contact: Contact } | { ok: false; errors: ContactErrors };

// Texte facultatif : espaces retirés, longueur maximale, vide ou absent enregistré comme null.
const optionalText = (max: number, error: string) =>
  z.string().trim().max(max, { error }).optional().transform((value) => value || null);

// Règles métier d'un contact, en un seul schéma : réutilisé pour l'ajout (lot 1) et la modification (lot 6).
// Longueurs maximales : une action serveur peut être appelée sans l'écran, avec des champs démesurés.
export const contactSchema = z.object({
  name: z
    .string({ error: "Le nom est obligatoire" })
    .trim()
    .min(1, { error: "Le nom est obligatoire" })
    .max(200, { error: "Le nom est trop long (200 caractères maximum)" }),
  company: optionalText(200, "L'entreprise est trop longue (200 caractères maximum)"),
  email: optionalText(254, "L'e-mail est trop long (254 caractères maximum)").pipe(
    z.email({ error: "L'e-mail n'est pas valide" }).nullable(),
  ),
  phone: optionalText(30, "Le téléphone est trop long (30 caractères maximum)"),
});

// Ce que le service accepte de recevoir : tout est facultatif, c'est le schéma qui décide.
export type ContactInput = { name?: string; company?: string; email?: string; phone?: string };

// safeParse et non parse : une saisie refusée n'est pas une panne, on renvoie les erreurs.
export function validateContactInput(
  input: ContactInput,
): { ok: true; value: ContactFields } | { ok: false; errors: ContactErrors } {
  const result = contactSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  const { fieldErrors } = z.flattenError(result.error);
  const errors: ContactErrors = {};
  if (fieldErrors.name) errors.name = fieldErrors.name[0];
  if (fieldErrors.company) errors.company = fieldErrors.company[0];
  if (fieldErrors.email) errors.email = fieldErrors.email[0];
  if (fieldErrors.phone) errors.phone = fieldErrors.phone[0];
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

    // Mêmes règles qu'à l'ajout ; l'étape et la relance ne changent pas.
    async updateContact(id: string, input: ContactInput): Promise<UpdateContactResult> {
      if (!isContactId(id)) return { ok: false, errors: {}, error: NOT_FOUND };
      const result = validateContactInput(input);
      if (!result.ok) return result;
      const contact = await repository.update(id, result.value);
      return contact ? { ok: true, contact } : { ok: false, errors: {}, error: "Contact introuvable" };
    },

    async deleteContact(id: string): Promise<DeleteContactResult> {
      if (!isContactId(id)) return { ok: false, error: NOT_FOUND };
      return (await repository.delete(id)) ? { ok: true } : { ok: false, error: "Contact introuvable" };
    },

    listContacts(): Promise<Contact[]> {
      return repository.findAll();
    },

    // Une colonne par étape, toujours les six, même vides. L'ordre des contacts reçu est conservé.
    async getBoard(): Promise<Board> {
      const contacts = await repository.findAll();
      const columns = STAGES.map(({ id, label }) => {
        const inColumn = contacts.filter((contact) => contact.stage === id);
        return {
          stage: id,
          label,
          count: inColumn.length,
          contacts: inColumn,
          moves: allowedMoves(id),
          reopenTargets: reopenTargets(id),
        };
      });
      return { columns, total: contacts.length };
    },

    // Étape suivante, précédente ou Perdu : la règle décide, la couche données enregistre.
    async moveContact(id: string, move: Move): Promise<MoveResult> {
      if (!isContactId(id)) return { ok: false, error: NOT_FOUND };
      const parsedMove = moveSchema.safeParse(move);
      if (!parsedMove.success) return { ok: false, error: "Ce déplacement n'est pas possible" };

      const contact = await repository.findById(id);
      if (!contact) return { ok: false, error: "Contact introuvable" };

      const stage = targetStage(contact.stage, parsedMove.data);
      if (!stage) return { ok: false, error: "Ce déplacement n'est pas possible" };

      const moved = await repository.updateStage(id, stage);
      return moved ? { ok: true, contact: moved } : { ok: false, error: "Contact introuvable" };
    },

    // Rouvrir un contact Gagné ou Perdu, vers une étape en cours choisie à la main.
    async reopenContact(id: string, stage: Stage): Promise<MoveResult> {
      if (!isContactId(id)) return { ok: false, error: NOT_FOUND };
      const parsedStage = stageSchema.safeParse(stage);
      if (!parsedStage.success) return { ok: false, error: "Ce déplacement n'est pas possible" };

      const contact = await repository.findById(id);
      if (!contact) return { ok: false, error: "Contact introuvable" };

      if (!reopenTargets(contact.stage).some((target) => target.stage === parsedStage.data)) {
        return { ok: false, error: "Ce déplacement n'est pas possible" };
      }

      const moved = await repository.updateStage(id, parsedStage.data);
      return moved ? { ok: true, contact: moved } : { ok: false, error: "Contact introuvable" };
    },

    async setFollowUp(id: string, input: FollowUpInput): Promise<FollowUpResult> {
      if (!isContactId(id)) return { ok: false, error: NOT_FOUND };
      const parsed = followUpSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: "La date n'est pas valide" };

      // Une nouvelle date remplace l'ancienne et met fin à l'attente de réponse.
      const contact = await repository.updateFollowUp(id, { date: parsed.data.date, awaitingReply: false });
      return contact ? { ok: true, contact } : { ok: false, error: "Contact introuvable" };
    },

    // Relance faite : le contact attend une réponse, garde sa date et reste dans sa colonne.
    async markFollowUpDone(id: string): Promise<FollowUpResult> {
      if (!isContactId(id)) return { ok: false, error: NOT_FOUND };
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
