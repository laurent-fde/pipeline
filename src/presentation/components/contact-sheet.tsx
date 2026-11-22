"use client";

import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { Contact } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 border-t border-border px-4 py-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

// Un lien d'appel seulement pour un vrai numéro (chiffres, espaces, points, tirets, parenthèses, + en tête).
function telHref(phone: string): string | null {
  const digits = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{3,}$/.test(digits) ? `tel:${digits}` : null;
}

// Lot 9 : la fiche d'un contact, ouverte en cliquant sur son nom. Elle regroupe ce qui était posé sur la carte.
// Une seule fiche pour tout le tableau, pilotée par open : elle reste ouverte quand le contact change de colonne.
// stage, followUp, actions : les blocs fournis par le tableau (boutons d'étape, relance, modifier/supprimer).
export function ContactSheet({
  contact,
  stageLabel,
  open,
  onOpenChange,
  notice,
  stage,
  followUp,
  actions,
}: {
  contact: Contact;
  stageLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lot 10 : un message en tête de fiche (contact sorti de la recherche ou du filtre).
  notice?: string;
  stage?: ReactNode;
  followUp?: ReactNode;
  actions?: ReactNode;
}) {
  const hasCoordinates = !!contact.email || !!contact.phone;
  const tel = contact.phone ? telHref(contact.phone) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle className="text-lg">{contact.name}</SheetTitle>
          <SheetDescription>{contact.company ?? "Sans entreprise"}</SheetDescription>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary">{stageLabel}</Badge>
            {contact.awaitingReply && <Badge variant="outline">En attente de réponse</Badge>}
          </div>
        </SheetHeader>

        {notice && (
          <p role="status" className="mx-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        {stage && <Section title="Étape">{stage}</Section>}

        <Section title="Coordonnées">
          {hasCoordinates ? (
            <ul className="grid gap-1.5 font-mono text-sm">
              {contact.email && (
                <li className="flex min-w-0 items-center gap-2">
                  <Mail aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  {tel ? (
                    <a href={tel} className="hover:underline">
                      {contact.phone}
                    </a>
                  ) : (
                    <span>{contact.phone}</span>
                  )}
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune coordonnée</p>
          )}
        </Section>

        {followUp && <Section title="Relance">{followUp}</Section>}
        {actions && <Section title="Actions">{actions}</Section>}
      </SheetContent>
    </Sheet>
  );
}
