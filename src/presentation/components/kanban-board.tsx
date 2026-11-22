"use client";

import { useState } from "react";
import type { ContactFormState, FollowUpState, MoveState } from "@/presentation/actions/contact.action";
import type { Board, BoardColumn, Move, Stage } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";
import { cn } from "@/presentation/lib/utils";
import { useSetView } from "./board-toolbar";
import { Button } from "@/presentation/components/ui/button";
import { ContactActions } from "./contact-actions";
import { ContactCard } from "./contact-card";
import { ContactSheet } from "./contact-sheet";
import { FollowUpForm } from "./follow-up-form";
import { DragBoard, DragHandle, DraggableCard, DropColumn } from "./kanban-drag";
import { NextStepButton } from "./next-step-button";
import { StageControls } from "./stage-controls";

type MoveAction = (id: string, move: Move) => Promise<MoveState>;
type ReopenAction = (id: string, stage: Stage) => Promise<MoveState>;
type FollowUpAction = (prev: FollowUpState, formData: FormData) => Promise<FollowUpState>;
type UpdateAction = (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;
type DeleteAction = (id: string) => Promise<{ error?: string }>;
type DropAction = (id: string, stage: Stage) => Promise<MoveState>;

// Les actions posées sur chaque carte et dans sa fiche. Absentes : lecture seule.
type CardActions = {
  moveAction?: MoveAction;
  reopenAction?: ReopenAction;
  followUpAction?: FollowUpAction;
  updateAction?: UpdateAction;
  deleteAction?: DeleteAction;
};

const countLabel = (count: number) => `${count} contact${count > 1 ? "s" : ""}`;

// Lot 9 : la couleur de chaque étape, prise dans les variables du thème (clair et sombre).
const STAGE_ACCENT: Record<string, string> = {
  nouveau: "border-t-chart-2",
  contacte: "border-t-chart-4",
  rdv: "border-t-chart-3",
  proposition: "border-t-chart-6",
  gagne: "border-t-chart-1",
  perdu: "border-t-chart-5",
};
const CLOSED = new Set(["gagne", "perdu"]);

function Column({
  column,
  moveAction,
  onOpen,
}: { column: BoardColumn; moveAction?: MoveAction; onOpen: (id: string) => void }) {
  const headingId = `colonne-${column.stage}`;
  const closed = CLOSED.has(column.stage);

  return (
    <DropColumn
      stage={column.stage}
      aria-labelledby={headingId}
      data-stage={column.stage}
      data-closed={closed || undefined}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border-t-4 bg-muted p-2",
        STAGE_ACCENT[column.stage],
        closed && "bg-muted/60",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 pt-1">
        <h3 id={headingId} className={cn("font-heading text-sm font-semibold", closed && "text-muted-foreground")}>
          {column.label}
        </h3>
        <Badge variant="secondary" aria-label={countLabel(column.count)} className="font-mono">
          {column.count}
        </Badge>
      </header>
      {column.contacts.length === 0 ? (
        <p className="grid min-h-20 place-items-center rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          <span>
            Aucun contact
            <br />
            Glisse une carte ici
          </span>
        </p>
      ) : (
        <ul className="grid gap-2">
          {column.contacts.map((contact) => (
            <DraggableCard key={contact.id} id={contact.id} className="min-w-0">
              <ContactCard
                contact={contact}
                className={cn(closed && "opacity-80")}
                leading={
                  <DragHandle id={contact.id} name={contact.name} stage={column.stage} targets={column.dropTargets} />
                }
                title={
                  <button
                    type="button"
                    onClick={() => onOpen(contact.id)}
                    className="max-w-full cursor-pointer truncate rounded-sm text-left hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {contact.name}
                  </button>
                }
                actions={
                  moveAction &&
                  column.moves.next && <NextStepButton contactId={contact.id} contactName={contact.name} action={moveAction} />
                }
              />
            </DraggableCard>
          ))}
        </ul>
      )}
    </DropColumn>
  );
}

// La fiche du contact choisi, retrouvé dans le tableau à chaque rendu : après un changement d'étape,
// elle montre sa nouvelle colonne ; s'il a été supprimé, elle se referme.
function SelectedSheet({
  board,
  selectedId,
  onClose,
  moveAction,
  reopenAction,
  followUpAction,
  updateAction,
  deleteAction,
}: { board: Board; selectedId: string | null; onClose: () => void } & CardActions) {
  const column = board.columns.find((c) => c.contacts.some((contact) => contact.id === selectedId));
  const contact = column?.contacts.find((c) => c.id === selectedId);
  if (!column || !contact) return null;

  return (
    <ContactSheet
      contact={contact}
      stageLabel={column.label}
      open
      onOpenChange={(open) => !open && onClose()}
      stage={
        moveAction && (
          <StageControls
            contactId={contact.id}
            contactName={contact.name}
            moves={column.moves}
            action={moveAction}
            reopenTargets={column.reopenTargets}
            reopenAction={reopenAction}
          />
        )
      }
      followUp={
        followUpAction && <FollowUpForm contactId={contact.id} followUpOn={contact.followUpOn} action={followUpAction} />
      }
      actions={
        updateAction &&
        deleteAction && <ContactActions contact={contact} updateAction={updateAction} deleteAction={deleteAction} />
      }
    />
  );
}

// Lot 10 : une recherche ou un filtre qui ne trouve rien, et le moyen de revenir au tableau complet.
function NoMatch() {
  const setView = useSetView();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
      <p className="text-sm text-muted-foreground">Aucun contact ne correspond</p>
      <Button variant="outline" size="sm" onClick={() => setView({ q: "", filtre: "tous" })}>
        Effacer la recherche
      </Button>
    </div>
  );
}

export function KanbanBoard({
  board,
  dropAction,
  ...actions
}: { board: Board; dropAction?: DropAction } & CardActions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const columns = (
    <div className="grid auto-cols-[minmax(11.5rem,1fr)] grid-flow-col gap-3">
      {board.columns.map((column) => (
        <Column key={column.stage} column={column} moveAction={actions.moveAction} onOpen={setSelectedId} />
      ))}
    </div>
  );

  return (
    <div className="grid gap-3">
      {board.total === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucun contact pour l&apos;instant. Ajoute ton premier contact avec le bouton « Nouveau contact ».
        </p>
      )}
      {board.total > 0 && board.visible === 0 && <NoMatch />}
      {/* Six colonnes côte à côte qui se partagent la largeur ; défilement horizontal seulement sur petit écran. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        {/* Lot 8 : avec un dépôt branché, les cartes se glissent d'une colonne à l'autre par leur poignée. */}
        {dropAction ? <DragBoard dropAction={dropAction}>{columns}</DragBoard> : columns}
      </div>
      <SelectedSheet board={board} selectedId={selectedId} onClose={() => setSelectedId(null)} {...actions} />
    </div>
  );
}
