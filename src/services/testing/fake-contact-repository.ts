import { vi } from "vitest";
import type { Contact, ContactRepository, NewContact } from "@/data/contact.repository";

// Fausse couche données pour les tests du service : un tableau en mémoire, jamais une vraie base.
export function fakeContactRepository(initial: Contact[] = []) {
  const contacts: Contact[] = [...initial];
  const find = (id: string) => contacts.find((contact) => contact.id === id) ?? null;

  const repository = {
    insert: vi.fn(async (input: NewContact) => {
      const contact: Contact = {
        ...input,
        id: String(contacts.length + 1),
        followUpOn: null,
        awaitingReply: false,
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      contacts.unshift(contact);
      return contact;
    }),
    findAll: vi.fn(async () => contacts.map((contact) => ({ ...contact }))),
    findById: vi.fn(async (id: string) => {
      const contact = find(id);
      return contact && { ...contact };
    }),
    updateStage: vi.fn(async (id: string, stage: string) => {
      const contact = find(id);
      if (!contact) return null;
      contact.stage = stage;
      return { ...contact };
    }),
    updateFollowUp: vi.fn(async (id: string, followUp: { date: string | null; awaitingReply: boolean }) => {
      const contact = find(id);
      if (!contact) return null;
      contact.followUpOn = followUp.date;
      contact.awaitingReply = followUp.awaitingReply;
      return { ...contact };
    }),
  } satisfies ContactRepository;

  return repository;
}

export const aContact = (overrides: Partial<Contact> & { id: string }): Contact => ({
  name: `Contact ${overrides.id}`,
  company: null,
  email: null,
  phone: null,
  stage: "nouveau",
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
  ...overrides,
});
