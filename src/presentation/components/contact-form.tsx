"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type ContactFormProps = {
  action: (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;
};

type FieldProps = {
  name: "name" | "company" | "email" | "phone";
  label: string;
  type?: "text" | "email" | "tel";
  autoComplete: string;
  state: ContactFormState;
  required?: boolean;
};

function Field({ name, label, type = "text", autoComplete, state, required }: FieldProps) {
  const id = `contact-${name}`;
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
        defaultValue={state.values?.[name] ?? ""}
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

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    // noValidate : la validation est celle du service, avec ses messages en français.
    <form action={formAction} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nom" autoComplete="name" state={state} required />
      <Field name="company" label="Entreprise" autoComplete="organization" state={state} />
      <Field name="email" label="E-mail" type="email" autoComplete="email" state={state} />
      <Field name="phone" label="Téléphone" type="tel" autoComplete="tel" state={state} />
      {state.formError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? "Ajout en cours…" : "Ajouter le contact"}
        </Button>
      </div>
    </form>
  );
}
