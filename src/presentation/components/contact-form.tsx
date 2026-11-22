"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import type { ContactInput } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type ContactFormProps = {
  action: (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  // Modification : le contact visé, ses valeurs actuelles, et un bouton pour annuler.
  contactId?: string;
  initialValues?: ContactInput;
  onCancel?: () => void;
  submitLabel?: string;
  pendingLabel?: string;
};

type FieldProps = {
  name: "name" | "company" | "email" | "phone";
  label: string;
  type?: "text" | "email" | "tel";
  autoComplete: string;
  state: ContactFormState;
  initialValues?: ContactInput;
  idPrefix: string;
  required?: boolean;
};

function Field({ name, label, type = "text", autoComplete, state, initialValues, idPrefix, required }: FieldProps) {
  const id = `${idPrefix}-${name}`;
  const error = name === "name" || name === "email" ? state.errors?.[name] : undefined;
  const errorId = `${id}-error`;

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-required={required || undefined}
        type={type}
        autoComplete={autoComplete}
        defaultValue={state.values?.[name] ?? initialValues?.[name] ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm({
  action,
  contactId,
  initialValues,
  onCancel,
  submitLabel = "Ajouter le contact",
  pendingLabel = "Ajout en cours…",
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldProps = { state, initialValues, idPrefix: contactId ? `contact-${contactId}` : "contact" };
  // Pleine largeur dans la grille à deux colonnes du formulaire d'ajout ; rien dans une carte (une colonne).
  const fullWidth = contactId ? "" : "sm:col-span-2";

  return (
    // noValidate : la validation est celle du service, avec ses messages en français.
    // Dans une carte (modification), une seule colonne : la carte est étroite.
    <form action={formAction} noValidate className={contactId ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      <Field name="name" label="Nom" autoComplete="name" {...fieldProps} required />
      <Field name="company" label="Entreprise" autoComplete="organization" {...fieldProps} />
      <Field name="email" label="E-mail" type="email" autoComplete="email" {...fieldProps} />
      <Field name="phone" label="Téléphone" type="tel" autoComplete="tel" {...fieldProps} />
      {state.formError && (
        <p role="alert" className={`text-sm text-destructive ${fullWidth}`}>
          {state.formError}
        </p>
      )}
      <div className={`flex flex-wrap gap-2 ${fullWidth}`}>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
