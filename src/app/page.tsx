import { connection } from "next/server";
import { Suspense } from "react";
import { getContactService, type BoardViewInput } from "@/services/contact.service";
import {
  addContactAction,
  deleteContactAction,
  dropContactAction,
  markFollowUpDoneAction,
  moveContactAction,
  reopenContactAction,
  setFollowUpAction,
  updateContactAction,
} from "@/presentation/actions/contact.action";
import { BoardToolbar } from "@/presentation/components/board-toolbar";
import { FollowUpList } from "@/presentation/components/follow-up-list";
import { KanbanBoard } from "@/presentation/components/kanban-board";
import { NewContactDialog } from "@/presentation/components/new-contact-dialog";
import { StatsBar } from "@/presentation/components/stats-bar";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Lu à chaque requête : le tableau reflète toujours la base.
// Lot 10 : la recherche et le filtre viennent de l'adresse ; le service les valide et filtre.
async function Board({ searchParams }: { searchParams: Promise<BoardViewInput> }) {
  await connection();
  const board = await getContactService().getBoard(await searchParams);
  return (
    <div className="grid gap-3">
      <BoardToolbar view={board.view} />
      <KanbanBoard
      board={board}
      moveAction={moveContactAction}
      reopenAction={reopenContactAction}
      followUpAction={setFollowUpAction}
      updateAction={updateContactAction}
      deleteAction={deleteContactAction}
      dropAction={dropContactAction}
      />
    </div>
  );
}

async function Stats() {
  await connection();
  const stats = await getContactService().getStats();
  return <StatsBar stats={stats} />;
}

async function FollowUps() {
  await connection();
  const followUps = await getContactService().getFollowUps();
  return <FollowUpList followUps={followUps} doneAction={markFollowUpDoneAction} />;
}

export default function Home({ searchParams }: { searchParams: Promise<BoardViewInput> }) {
  return (
    <>
      {/* Lot 9 : barre du haut, toujours visible. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-semibold">Pipeline</h1>
            <p className="truncate text-xs text-muted-foreground">Mes contacts de prospection</p>
          </div>
          <div className="flex items-center gap-2">
            <NewContactDialog action={addContactAction} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <section aria-label="Indicateurs">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des indicateurs…</p>}>
            <Stats />
          </Suspense>
        </section>

        <section aria-labelledby="relances" className="grid gap-3">
          <h2 id="relances" className="font-heading text-base font-semibold">
            À relancer
          </h2>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des relances…</p>}>
            <FollowUps />
          </Suspense>
        </section>

        <section aria-labelledby="contacts" className="grid gap-3">
          <h2 id="contacts" className="font-heading text-base font-semibold">
            Tableau
          </h2>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement du tableau…</p>}>
            <Board searchParams={searchParams} />
          </Suspense>
        </section>
      </main>
    </>
  );
}
