"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useTransition } from "react";
import type { MoveState } from "@/presentation/actions/contact.action";
import type { Move } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";

type StageControlsProps = {
  contactId: string;
  contactName: string;
  moves: Record<Move, boolean>;
  action: (id: string, move: Move) => Promise<MoveState>;
};

export function StageControls({ contactId, contactName, moves, action }: StageControlsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const move = (to: Move) =>
    startTransition(async () => {
      const result = await action(contactId, to);
      setError(result?.error);
    });

  return (
    <div className="grid gap-2">
      <div role="group" aria-label={`Étape de ${contactName}`} className="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="xs"
          disabled={pending || !moves.previous}
          onClick={() => move("previous")}
          aria-label="Étape précédente"
          title="Étape précédente"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="outline" size="xs" disabled={pending || !moves.next} onClick={() => move("next")}>
          Étape suivante
          <ChevronRight aria-hidden />
        </Button>
        <Button variant="ghost" size="xs" disabled={pending || !moves.lost} onClick={() => move("lost")}>
          <X aria-hidden />
          Marquer perdu
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
