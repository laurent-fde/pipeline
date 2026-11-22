"use client";

import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import type { MoveState } from "@/presentation/actions/contact.action";
import type { Move, ReopenTarget, Stage } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";

type StageControlsProps = {
  contactId: string;
  contactName: string;
  moves: Record<Move, boolean>;
  action: (id: string, move: Move) => Promise<MoveState>;
  // Contact Gagné ou Perdu : les étapes où le rouvrir (vide sinon).
  reopenTargets?: ReopenTarget[];
  reopenAction?: (id: string, stage: Stage) => Promise<MoveState>;
};

export function StageControls({
  contactId,
  contactName,
  moves,
  action,
  reopenTargets = [],
  reopenAction,
}: StageControlsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [reopenOpen, setReopenOpen] = useState(false);
  const reopenListId = useId();
  const canReopen = !!reopenAction && reopenTargets.length > 0;

  const move = (to: Move) =>
    startTransition(async () => {
      const result = await action(contactId, to);
      setError(result?.error);
    });

  const reopen = (stage: Stage) =>
    startTransition(async () => {
      const result = await reopenAction?.(contactId, stage);
      setError(result?.error);
      if (!result?.error) setReopenOpen(false);
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
        {canReopen && (
          <Button
            variant="outline"
            size="xs"
            disabled={pending}
            aria-expanded={reopenOpen}
            aria-controls={reopenListId}
            onClick={() => setReopenOpen((open) => !open)}
          >
            <RotateCcw aria-hidden />
            Rouvrir vers…
            <ChevronDown aria-hidden />
          </Button>
        )}
      </div>
      {canReopen && reopenOpen && (
        <div id={reopenListId} role="group" aria-label={`Rouvrir ${contactName} vers`} className="flex flex-wrap gap-1">
          {reopenTargets.map((target) => (
            <Button
              key={target.stage}
              variant="secondary"
              size="xs"
              disabled={pending}
              onClick={() => reopen(target.stage)}
            >
              {target.label}
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
