import type { FollowUp } from "@/services/contact.service";
import { Badge } from "@/presentation/components/ui/badge";

export function FollowUpList({ followUps }: { followUps: FollowUp[] }) {
  if (followUps.length === 0) {
    return <p className="text-sm text-muted-foreground">Personne à relancer aujourd&apos;hui</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {followUps.map(({ contact, overdue }) => (
        <li key={contact.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{contact.name}</p>
            {contact.company && <p className="truncate text-xs text-muted-foreground">{contact.company}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {overdue && <Badge variant="destructive">en retard</Badge>}
            <time dateTime={contact.followUpOn ?? undefined} className="font-mono text-xs text-muted-foreground">
              {contact.followUpOn}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
