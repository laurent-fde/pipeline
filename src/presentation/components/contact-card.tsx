import type { ReactNode } from "react";
import type { Contact, FollowUpState } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";
import { cn } from "@/presentation/lib/utils";

type CardContact = Contact & { followUp?: FollowUpState };

// Lot 9 : le badge de relance. L'état (en retard, aujourd'hui, à venir) est décidé par le service.
function FollowUpBadge({ contact }: { contact: CardContact }) {
  if (contact.followUp === "overdue") return <Badge variant="destructive">en retard</Badge>;
  if (contact.followUp === "today")
    return <Badge className="bg-warning text-warning-foreground">aujourd&apos;hui</Badge>;
  if (contact.followUp === "upcoming")
    return (
      <Badge variant="outline" className="font-mono">
        <time dateTime={contact.followUpOn ?? undefined}>{contact.followUpOn}</time>
      </Badge>
    );
  return null;
}

// Lot 9 : carte compacte. Nom, entreprise, badges ; les coordonnées et les actions sont dans la fiche.
// leading : la poignée de glissement ; title : le nom cliquable qui ouvre la fiche ; actions : à droite.
export function ContactCard({
  contact,
  leading,
  title,
  actions,
  className,
}: {
  contact: CardContact;
  leading?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const hasBadges = !!contact.followUp || contact.awaitingReply;

  return (
    <article
      className={cn(
        "flex min-w-0 items-start gap-1.5 rounded-lg border border-border bg-card p-2 text-card-foreground shadow-xs",
        className,
      )}
    >
      {leading}
      <div className="grid min-w-0 flex-1 gap-1">
        {/* Niveau 4 : sous le titre de colonne (niveau 3) du tableau. */}
        <h4 className="truncate text-sm leading-snug font-medium">{title ?? contact.name}</h4>
        {contact.company && <p className="truncate text-xs text-muted-foreground">{contact.company}</p>}
        {hasBadges && (
          <div className="flex flex-wrap gap-1">
            <FollowUpBadge contact={contact} />
            {contact.awaitingReply && (
              <Badge variant="secondary" className="h-auto whitespace-normal">
                En attente de réponse
              </Badge>
            )}
          </div>
        )}
      </div>
      {actions}
    </article>
  );
}
