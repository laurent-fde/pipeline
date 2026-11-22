"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BoardFilter, BoardView } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

const FILTER_LABELS: { id: BoardFilter; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "a-relancer", label: "À relancer" },
  { id: "en-attente", label: "En attente de réponse" },
];

// Lot 10 : l'adresse de la page pour une vue. Les valeurs par défaut (recherche vide, « Tous ») n'y figurent pas.
export function viewHref(pathname: string, view: BoardView): string {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.filtre !== "tous") params.set("filtre", view.filtre);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

// Change la vue en remplaçant l'adresse : le tableau est relu par le serveur avec la nouvelle vue.
export function useSetView() {
  const router = useRouter();
  const pathname = usePathname();
  return (view: BoardView) => router.replace(viewHref(pathname, view), { scroll: false });
}

// Lot 10 : rechercher et filtrer au-dessus du tableau. view : la vue appliquée par le service.
export function BoardToolbar({ view }: { view: BoardView }) {
  const setView = useSetView();
  const [query, setQuery] = useState(view.q);
  // Recherche effacée ailleurs (« Effacer la recherche ») : le champ se vide aussi.
  const [appliedQuery, setAppliedQuery] = useState(view.q);
  if (view.q !== appliedQuery) {
    setAppliedQuery(view.q);
    if (view.q === "") setQuery("");
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // L'adresse suit la saisie peu après la frappe, pas à chaque touche.
  const type = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setView({ ...view, q: value.trim() }), 250);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Label htmlFor="recherche-contact" className="sr-only">
          Rechercher un contact
        </Label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="recherche-contact"
          type="search"
          placeholder="Rechercher un contact"
          autoComplete="off"
          maxLength={100}
          value={query}
          onChange={(event) => type(event.target.value)}
          className="pl-8"
        />
      </div>
      <div role="group" aria-label="Filtrer le tableau" className="flex flex-wrap gap-1">
        {FILTER_LABELS.map(({ id, label }) => (
          <Button
            key={id}
            size="sm"
            variant={view.filtre === id ? "default" : "outline"}
            aria-pressed={view.filtre === id}
            onClick={() => setView({ q: query.trim(), filtre: id })}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
