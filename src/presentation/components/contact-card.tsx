import type { Contact } from "@/services/contact.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Card size="sm">
      <CardHeader className="flex items-center gap-3">
        <div
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
        >
          {initials(contact.name)}
        </div>
        <div className="min-w-0">
          {/* Niveau 4 : sous le titre de colonne (niveau 3) du tableau. */}
          <CardTitle role="heading" aria-level={4} className="truncate">
            {contact.name}
          </CardTitle>
          {contact.company && <p className="truncate text-sm text-muted-foreground">{contact.company}</p>}
        </div>
      </CardHeader>
      {(contact.email || contact.phone) && (
        <CardContent className="grid gap-1 font-mono text-xs text-muted-foreground">
          {contact.email && <span className="truncate">{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
        </CardContent>
      )}
    </Card>
  );
}
