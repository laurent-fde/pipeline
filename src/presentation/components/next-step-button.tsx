"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import type { MoveState } from "@/presentation/actions/contact.action";
import type { Move } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";

// Lot 9 : le seul bouton d'étape laissé sur la carte. Les autres sont dans la fiche.
export function NextStepButton({
  contactId,
  contactName,
  action,
}: {
  contactId: string;
  contactName: string;
  action: (id: string, move: Move) => Promise<MoveState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const label = `Passer ${contactName} à l'étape suivante`;

  return (
    <div className="flex shrink-0 flex-col items-end">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        title={error ?? label}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action(contactId, "next");
            setError(result?.error);
          })
        }
        className={error ? "text-destructive" : "text-muted-foreground"}
      >
        <ArrowRight aria-hidden />
      </Button>
      {/* Toujours présent, vide sans erreur : les lecteurs d'écran annoncent le message dès qu'il apparaît. */}
      <span role="status" className="max-w-24 text-right text-[0.65rem] leading-tight text-destructive">
        {error}
      </span>
    </div>
  );
}
