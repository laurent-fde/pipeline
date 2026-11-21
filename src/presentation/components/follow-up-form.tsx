"use client";

import { useActionState } from "react";
import type { FollowUpState } from "@/presentation/actions/contact.action";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

type FollowUpFormProps = {
  contactId: string;
  followUpOn: string | null;
  action: (prev: FollowUpState, formData: FormData) => Promise<FollowUpState>;
};

export function FollowUpForm({ contactId, followUpOn, action }: FollowUpFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const id = `relance-${contactId}`;
  const errorId = `${id}-error`;

  return (
    <form action={formAction} noValidate className="grid min-w-0 gap-1">
      <input type="hidden" name="contactId" value={contactId} />
      <Label htmlFor={id} className="text-xs">
        Relance
      </Label>
      {/* Empilés : la colonne du tableau est étroite. */}
      <div className="grid min-w-0 gap-1">
        <Input
          id={id}
          name="date"
          type="date"
          defaultValue={followUpOn ?? ""}
          className="h-7 w-full min-w-0 px-1.5 font-mono text-xs"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
        />
        <Button type="submit" variant="outline" size="xs" disabled={pending} className="h-7 w-full">
          Fixer la relance
        </Button>
      </div>
      {state.error && (
        <p id={errorId} className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
