import { connection } from "next/server";
import { Suspense } from "react";
import { getContactService } from "@/services/contact.service";
import { addContactAction } from "@/presentation/actions/contact.action";
import { ContactForm } from "@/presentation/components/contact-form";
import { ContactList } from "@/presentation/components/contact-list";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

// Lue à chaque requête : la liste reflète toujours la base.
async function Contacts() {
  await connection();
  const contacts = await getContactService().listContacts();
  return <ContactList contacts={contacts} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
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
        <ContactForm action={addContactAction} />
      </section>

      <section aria-labelledby="contacts" className="grid gap-4">
        <h2 id="contacts" className="font-heading text-lg font-semibold">
          Contacts
        </h2>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des contacts…</p>}>
          <Contacts />
        </Suspense>
      </section>
    </main>
  );
}
