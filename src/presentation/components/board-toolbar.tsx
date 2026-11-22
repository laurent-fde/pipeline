"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BoardFilter, BoardView } from "@/services/contact.service";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";

const FILTER_LABELS: { id: BoardFilter; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "a-relancer", label: "À relancer" },
  { id: "en-attente", label: "En attente de réponse" },
];

const TYPING_DELAY = 250;

// Lot 10 : l'adresse de la page pour une vue. Les valeurs par défaut (recherche vide, « Tous ») n'y figurent pas.
export function viewHref(pathname: string, view: BoardView): string {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.filtre !== "tous") params.set("filtre", view.filtre);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

type BoardViewContextValue = {
  view: BoardView;
  query: string;
  type: (value: string) => void;
  setFilter: (filtre: BoardFilter) => void;
  // « Effacer la recherche » : vide la recherche ET retire le filtre, pour revenir au tableau complet.
  clear: () => void;
};

const BoardViewContext = createContext<BoardViewContextValue | null>(null);

export function useBoardView(): BoardViewContextValue {
  const value = useContext(BoardViewContext);
  if (!value) throw new Error("useBoardView doit être utilisé dans un BoardViewProvider");
  return value;
}

// Lot 10 : la vue du tableau (recherche et filtre), partagée par la barre et « Aucun contact ne correspond ».
// view : la vue appliquée par le service, lue dans l'adresse. Choix : l'adresse est remplacée (router.replace),
// sans ajouter d'entrée à l'historique ; le bouton « retour » du navigateur quitte donc la page.
export function BoardViewProvider({ view, children }: { view: BoardView; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(view.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [typing, setTyping] = useState(false);
  // Le filtre demandé, connu tout de suite (la page met un instant à revenir avec la nouvelle vue).
  const filter = useRef(view.filtre);

  // L'adresse change ailleurs (rechargement, « Effacer la recherche », lien) : le champ et le filtre la suivent,
  // sauf pendant que je tape encore (sinon le champ reviendrait en arrière sous mes doigts).
  const [applied, setApplied] = useState(view);
  if (view.q !== applied.q || view.filtre !== applied.filtre) {
    setApplied(view);
    if (!typing) setQuery(view.q);
  }
  useEffect(() => {
    filter.current = view.filtre;
  }, [view.filtre]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (next: BoardView) => router.replace(viewHref(pathname, next), { scroll: false });
  const cancelTyping = () => {
    clearTimeout(timer.current);
    setTyping(false);
  };

  const value: BoardViewContextValue = {
    view,
    query,
    // L'adresse suit la saisie peu après la frappe, pas à chaque touche, avec le filtre du moment.
    type: (text) => {
      setQuery(text);
      clearTimeout(timer.current);
      setTyping(true);
      timer.current = setTimeout(() => {
        setTyping(false);
        go({ q: text.trim(), filtre: filter.current });
      }, TYPING_DELAY);
    },
    setFilter: (filtre) => {
      cancelTyping();
      filter.current = filtre;
      go({ q: query.trim(), filtre });
    },
    clear: () => {
      cancelTyping();
      filter.current = "tous";
      setQuery("");
      go({ q: "", filtre: "tous" });
    },
  };

  return <BoardViewContext.Provider value={value}>{children}</BoardViewContext.Provider>;
}

// Lot 10 : rechercher et filtrer au-dessus du tableau.
export function BoardToolbar() {
  const { view, query, type, setFilter } = useBoardView();

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
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
