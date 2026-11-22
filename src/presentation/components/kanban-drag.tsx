"use client";

import { createContext, useContext, useEffect, useState, useTransition, type DragEvent, type ReactNode } from "react";
import type { MoveState } from "@/presentation/actions/contact.action";
import type { Stage } from "@/services/contact.service";
import { cn } from "@/presentation/lib/utils";

// Lot 8 : glisser-déposer natif du navigateur. La règle reste au service :
// les colonnes permises viennent de `dropTargets`, et le service refuse tout autre dépôt.
type DropAction = (id: string, stage: Stage) => Promise<MoveState>;
type Dragging = { id: string; from: Stage; targets: Stage[] };

type DragContextValue = {
  dragging: Dragging | null;
  // Un dépôt est en cours d'enregistrement : aucun nouveau glissement (#27).
  pending: boolean;
  over: Stage | null;
  start: (dragging: Dragging) => void;
  end: () => void;
  enter: (stage: Stage) => void;
  drop: (stage: Stage) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

export function DragBoard({ dropAction, children }: { dropAction: DropAction; children: ReactNode }) {
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const end = () => {
    setDragging(null);
    setOver(null);
  };

  // #27 : si la carte disparaît pendant le glissement (page rafraîchie), son dragend ne remonte plus.
  // La fenêtre reçoit quand même la fin du glissement : on remet le tableau à zéro.
  const dragActive = dragging !== null;
  useEffect(() => {
    if (!dragActive) return;
    const reset = () => {
      setDragging(null);
      setOver(null);
    };
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
    };
  }, [dragActive]);

  const value: DragContextValue = {
    dragging,
    pending,
    over,
    // #28 : le message n'est pas effacé ici, pour ne pas décaler le tableau sous la carte.
    start: (next) => {
      if (!pending) setDragging(next);
    },
    end,
    enter: setOver,
    drop: (stage) => {
      const current = dragging;
      end();
      if (!current || stage === current.from || pending) return;
      setError(undefined);
      startTransition(async () => {
        const result = await dropAction(current.id, stage);
        setError(result?.error);
      });
    },
  };

  return (
    <DragContext.Provider value={value}>
      {/* #28 : toujours présent, hauteur réservée : le message n'apparaît ni ne disparaît en décalant le tableau. */}
      <p role="alert" className="min-h-5 text-sm text-destructive">
        {error}
      </p>
      {children}
    </DragContext.Provider>
  );
}

type DropState = "source" | "allowed" | "refused";

function dropState(dragging: Dragging | null, stage: Stage): DropState | undefined {
  if (!dragging) return undefined;
  if (stage === dragging.from) return "source";
  return dragging.targets.includes(stage) ? "allowed" : "refused";
}

// Une colonne du tableau. Sans DragBoard autour, c'est une simple section.
export function DropColumn({
  stage,
  className,
  children,
  ...props
}: { stage: Stage; className?: string; children: ReactNode; "aria-labelledby": string }) {
  const drag = useContext(DragContext);
  const state = dropState(drag?.dragging ?? null, stage);

  // Hors colonne d'origine, le dépôt est accepté : le service décide et annonce un refus.
  const accept = (event: DragEvent) => {
    if (!drag?.dragging || state === "source") return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (drag.over !== stage) drag.enter(stage);
  };

  return (
    <section
      {...props}
      data-drop={state}
      onDragOver={accept}
      onDragEnter={accept}
      onDrop={(event) => {
        if (!drag?.dragging) return;
        event.preventDefault();
        drag.drop(stage);
      }}
      className={cn(
        className,
        "transition-colors",
        state === "allowed" && "outline-2 outline-offset-2 outline-dashed outline-primary",
        state === "allowed" && drag?.over === stage && "bg-accent",
        state === "refused" && "opacity-50",
      )}
    >
      {children}
    </section>
  );
}

// La carte d'un contact. Déplaçable seulement dans un DragBoard ; les boutons d'étape restent.
export function DraggableCard({
  id,
  stage,
  targets,
  className,
  children,
}: {
  id: string;
  stage: Stage;
  targets: Stage[];
  className?: string;
  children: ReactNode;
}) {
  const drag = useContext(DragContext);
  if (!drag) return <li className={className}>{children}</li>;

  return (
    <li
      draggable={!drag.pending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", id);
        event.dataTransfer.effectAllowed = "move";
        drag.start({ id, from: stage, targets });
      }}
      onDragEnd={drag.end}
      className={cn(className, "cursor-grab active:cursor-grabbing", drag.dragging?.id === id && "opacity-50")}
    >
      {children}
    </li>
  );
}
