"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import type { Contact } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";
import { ContactForm } from "./contact-form";

type ContactActionsProps = {
  contact: Contact;
  updateAction: (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
};

type Mode = "idle" | "editing" | "confirming";

export function ContactActions({ contact, updateAction, deleteAction }: ContactActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  // Enregistré : on referme le formulaire.
  const save = async (prev: ContactFormState, formData: FormData) => {
    const result = await updateAction(prev, formData);
    if (result.saved) setMode("idle");
    return result;
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deleteAction(contact.id);
      setError(result?.error);
    });

  if (mode === "editing") {
    return (
      <ContactForm
        action={save}
        contactId={contact.id}
        initialValues={{
          name: contact.name,
          company: contact.company ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }}
        onCancel={() => setMode("idle")}
        submitLabel="Enregistrer"
        pendingLabel="Enregistrement…"
      />
    );
  }

  if (mode === "confirming") {
    return (
      <div className="grid gap-2 rounded-lg border border-destructive/40 p-2">
        <p className="text-xs font-medium">Supprimer {contact.name} ?</p>
        <div className="grid gap-1">
          <Button variant="destructive" size="xs" disabled={pending} onClick={remove} className="h-auto py-1 whitespace-normal">
            Confirmer la suppression
          </Button>
          <Button variant="ghost" size="xs" disabled={pending} onClick={() => setMode("idle")}>
            Annuler
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="ghost" size="xs" aria-label={`Modifier ${contact.name}`} onClick={() => setMode("editing")}>
        <Pencil aria-hidden />
        Modifier
      </Button>
      <Button
        variant="ghost"
        size="xs"
        aria-label={`Supprimer ${contact.name}`}
        onClick={() => {
          setError(undefined);
          setMode("confirming");
        }}
      >
        <Trash2 aria-hidden />
        Supprimer
      </Button>
    </div>
  );
}
