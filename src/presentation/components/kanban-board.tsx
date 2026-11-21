import type { MoveState } from "@/presentation/actions/contact.action";
import type { Board, BoardColumn, Move } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";
import { ContactCard } from "./contact-card";
import { StageControls } from "./stage-controls";

type MoveAction = (id: string, move: Move) => Promise<MoveState>;

const countLabel = (count: number) => `${count} contact${count > 1 ? "s" : ""}`;

function Column({ column, moveAction }: { column: BoardColumn; moveAction?: MoveAction }) {
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
          <li key={contact.id}>
            <ContactCard contact={contact}>
              {moveAction && (
                <StageControls
                  contactId={contact.id}
                  contactName={contact.name}
                  moves={column.moves}
                  action={moveAction}
                />
              )}
            </ContactCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KanbanBoard({ board, moveAction }: { board: Board; moveAction?: MoveAction }) {
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
            <Column key={column.stage} column={column} moveAction={moveAction} />
          ))}
        </div>
      </div>
    </div>
  );
}
