import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardView } from "@/services/contact.service";
import { BoardToolbar, BoardViewProvider, useBoardView } from "./board-toolbar";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => replace.mockClear());

const search = () => screen.getByLabelText("Rechercher un contact") as HTMLInputElement;
const filter = (name: string) => screen.getByRole("button", { name });
const toolbar = (view: BoardView) => (
  <BoardViewProvider view={view}>
    <BoardToolbar />
  </BoardViewProvider>
);

// Le bouton de « Aucun contact ne correspond », pour tester son lien avec le champ.
function ClearButton() {
  const { clear } = useBoardView();
  return <button onClick={clear}>Effacer la recherche</button>;
}

// Lot 10 : la recherche et le filtre vivent dans l'adresse de la page.
describe("couche présentation · BoardToolbar (lot 10)", () => {
  // Critère 1 : la saisie met l'adresse à jour, peu après la frappe.
  it("met la recherche dans l'adresse de la page", async () => {
    render(toolbar({ q: "", filtre: "tous" }));

    fireEvent.change(search(), { target: { value: "lumen" } });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/?q=lumen", { scroll: false }));
  });

  it("retire la recherche de l'adresse quand le champ est vidé, en gardant le filtre", async () => {
    render(toolbar({ q: "lumen", filtre: "a-relancer" }));

    fireEvent.change(search(), { target: { value: "" } });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/?filtre=a-relancer", { scroll: false }));
  });

  // Critère 2 : les trois filtres, l'actif est marqué ; un clic met l'adresse à jour, la recherche est gardée.
  it("marque le filtre actif et change de filtre en gardant la recherche", () => {
    render(toolbar({ q: "lumen", filtre: "tous" }));

    expect(filter("Tous").getAttribute("aria-pressed")).toBe("true");
    expect(filter("À relancer").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(filter("À relancer"));
    expect(replace).toHaveBeenCalledWith("/?q=lumen&filtre=a-relancer", { scroll: false });

    fireEvent.click(filter("En attente de réponse"));
    expect(replace).toHaveBeenCalledWith("/?q=lumen&filtre=en-attente", { scroll: false });
  });

  it("« Tous » retire le filtre de l'adresse", () => {
    render(toolbar({ q: "", filtre: "en-attente" }));

    fireEvent.click(filter("Tous"));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  // Revue du lot 10 : un filtre choisi juste après la frappe n'est pas écrasé par la saisie en attente.
  it("garde le filtre cliqué pendant que la saisie attend d'être appliquée", () => {
    vi.useFakeTimers();
    render(toolbar({ q: "", filtre: "tous" }));

    fireEvent.change(search(), { target: { value: "lum" } });
    fireEvent.click(filter("À relancer"));
    act(() => vi.advanceTimersByTime(1000));

    expect(replace).toHaveBeenLastCalledWith("/?q=lum&filtre=a-relancer", { scroll: false });
    expect(replace).toHaveBeenCalledTimes(1);
  });

  // Critère 4 et revue : « Effacer la recherche » annule la saisie en attente, vide le champ et retire le filtre.
  it("« Effacer la recherche » vide le champ, retire le filtre et annule la saisie en attente", () => {
    vi.useFakeTimers();
    render(
      <BoardViewProvider view={{ q: "", filtre: "a-relancer" }}>
        <BoardToolbar />
        <ClearButton />
      </BoardViewProvider>,
    );

    fireEvent.change(search(), { target: { value: "zzz" } });
    fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    act(() => vi.advanceTimersByTime(1000));

    expect(search().value).toBe("");
    expect(replace).toHaveBeenLastCalledWith("/", { scroll: false });
    expect(replace).toHaveBeenCalledTimes(1);
  });

  // Critère 5 : après un rechargement, le champ et le filtre reprennent la vue de l'adresse.
  it("reprend la recherche et le filtre de l'adresse", () => {
    render(toolbar({ q: "inès", filtre: "en-attente" }));

    expect(search().value).toBe("inès");
    expect(filter("En attente de réponse").getAttribute("aria-pressed")).toBe("true");
  });

  // Revue du lot 10 : le champ suit l'adresse quand elle change ailleurs, même vers une autre recherche.
  it("recale le champ sur l'adresse quand elle change ailleurs", () => {
    const { rerender } = render(toolbar({ q: "lumen", filtre: "tous" }));

    rerender(toolbar({ q: "claire", filtre: "tous" }));
    expect(search().value).toBe("claire");

    rerender(toolbar({ q: "", filtre: "tous" }));
    expect(search().value).toBe("");
  });

  it("ne recale pas le champ pendant que je tape encore", () => {
    vi.useFakeTimers();
    const { rerender } = render(toolbar({ q: "", filtre: "tous" }));

    fireEvent.change(search(), { target: { value: "lum" } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(search(), { target: { value: "lume" } });
    // La page revient avec la recherche « lum » pendant que je tape « lume ».
    rerender(toolbar({ q: "lum", filtre: "tous" }));

    expect(search().value).toBe("lume");
  });
});
