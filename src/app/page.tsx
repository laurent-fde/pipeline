import { connection } from "next/server";
import { Suspense } from "react";
import { getContactService } from "@/services/contact.service";
import {
  addContactAction,
  markFollowUpDoneAction,
  moveContactAction,
  setFollowUpAction,
} from "@/presentation/actions/contact.action";
import { ContactForm } from "@/presentation/components/contact-form";
import { FollowUpList } from "@/presentation/components/follow-up-list";
import { KanbanBoard } from "@/presentation/components/kanban-board";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Lu à chaque requête : le tableau reflète toujours la base.
async function Board() {
  await connection();
  const board = await getContactService().getBoard();
  return <KanbanBoard board={board} moveAction={moveContactAction} followUpAction={setFollowUpAction} />;
}

async function FollowUps() {
  await connection();
  const followUps = await getContactService().getFollowUps();
  return <FollowUpList followUps={followUps} doneAction={markFollowUpDoneAction} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">Mes contacts de prospection</p>
        </div>
        <ThemeToggle />
      </header>

      <section aria-labelledby="ajout" className="grid gap-4">
        <h2 id="ajout" className="font-heading text-lg font-semibold">
          Ajouter un contact
        </h2>
        <div className="max-w-3xl">
          <ContactForm action={addContactAction} />
        </div>
      </section>

      <section aria-labelledby="relances" className="grid gap-4">
        <h2 id="relances" className="font-heading text-lg font-semibold">
          À relancer
        </h2>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des relances…</p>}>
          <FollowUps />
        </Suspense>
      </section>

      <section aria-labelledby="contacts" className="grid gap-4">
        <h2 id="contacts" className="font-heading text-lg font-semibold">
          Tableau
        </h2>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement du tableau…</p>}>
          <Board />
        </Suspense>
      </section>
    </main>
  );
}
