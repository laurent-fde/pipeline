import type { FollowUpState, MoveState } from "@/presentation/actions/contact.action";
import type { Board, BoardColumn, Move } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";
import { ContactCard } from "./contact-card";
import { FollowUpForm } from "./follow-up-form";
import { StageControls } from "./stage-controls";

type MoveAction = (id: string, move: Move) => Promise<MoveState>;
type FollowUpAction = (prev: FollowUpState, formData: FormData) => Promise<FollowUpState>;

// Les actions posées sur chaque carte. Absentes : la carte est en lecture seule.
type CardActions = { moveAction?: MoveAction; followUpAction?: FollowUpAction };

const countLabel = (count: number) => `${count} contact${count > 1 ? "s" : ""}`;

function Column({ column, moveAction, followUpAction }: { column: BoardColumn } & CardActions) {
  const headingId = `colonne-${column.stage}`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted p-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-heading text-sm font-semibold">
          {column.label}
        </h3>
        <Badge variant="secondary" aria-label={countLabel(column.count)} className="font-mono">
          {column.count}
        </Badge>
      </header>
      <ul className="grid gap-2">
        {column.contacts.map((contact) => (
          <li key={contact.id} className="min-w-0">
            <ContactCard contact={contact}>
              {moveAction && (
                <StageControls
                  contactId={contact.id}
                  contactName={contact.name}
                  moves={column.moves}
                  action={moveAction}
                />
              )}
              {followUpAction && (
                <FollowUpForm contactId={contact.id} followUpOn={contact.followUpOn} action={followUpAction} />
              )}
            </ContactCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KanbanBoard({ board, ...actions }: { board: Board } & CardActions) {
  return (
    <div className="grid gap-4">
      {board.total === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucun contact pour l&apos;instant. Ajoute ton premier contact avec le formulaire ci-dessus.
        </p>
      )}
      {/* Six colonnes côte à côte qui se partagent la largeur ; défilement horizontal seulement sur petit écran. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid auto-cols-[minmax(12rem,1fr)] grid-flow-col gap-3">
          {board.columns.map((column) => (
            <Column key={column.stage} column={column} {...actions} />
          ))}
        </div>
      </div>
    </div>
  );
}
