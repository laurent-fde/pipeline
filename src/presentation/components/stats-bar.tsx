import { CalendarClock, Hourglass, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Stats } from "@/services/contact.service";

function Tile({ label, icon, value, detail }: { label: string; icon: ReactNode; value: ReactNode; detail?: ReactNode }) {
  const id = `indicateur-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={id} className="grid gap-1 rounded-lg border border-border bg-card p-3">
      <p id={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold">{value}</p>
      <p className="min-h-4 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

// Lot 9 : les quatre indicateurs, calculés par le service (getStats).
export function StatsBar({ stats }: { stats: Stats }) {
  const icon = "size-3.5";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Contacts en cours" icon={<Users aria-hidden className={icon} />} value={stats.active} detail={`sur ${stats.total}`} />
      <Tile
        label="À relancer"
        icon={<CalendarClock aria-hidden className={icon} />}
        value={stats.due}
        detail={stats.overdue > 0 && <span className="text-destructive">{stats.overdue} en retard</span>}
      />
      <Tile label="En attente de réponse" icon={<Hourglass aria-hidden className={icon} />} value={stats.waiting} />
      <Tile
        label="Taux de gain"
        icon={<Trophy aria-hidden className={icon} />}
        value={stats.winRate === null ? "—" : `${stats.winRate} %`}
        detail={`${stats.won} gagné${stats.won > 1 ? "s" : ""} · ${stats.lost} perdu${stats.lost > 1 ? "s" : ""}`}
      />
    </div>
  );
}
