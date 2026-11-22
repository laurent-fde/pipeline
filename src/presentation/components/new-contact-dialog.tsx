"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { ContactFormState } from "@/presentation/actions/contact.action";
import { buttonVariants } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import { ContactForm } from "./contact-form";

type AddAction = (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;

// Lot 9 : le formulaire d'ajout dans une fenêtre. Un ajout réussi la ferme ; un refus la garde ouverte.
export function NewContactDialog({ action }: { action: AddAction }) {
  const [open, setOpen] = useState(false);

  const save: AddAction = async (prev, formData) => {
    const result = await action(prev, formData);
    if (!result.errors && !result.formError) setOpen(false);
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus aria-hidden />
        Nouveau contact
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau contact</DialogTitle>
          <DialogDescription>Il arrive dans la colonne Nouveau.</DialogDescription>
        </DialogHeader>
        <ContactForm action={save} />
      </DialogContent>
    </Dialog>
  );
}
