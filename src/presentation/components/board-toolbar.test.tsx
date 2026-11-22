import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardToolbar } from "./board-toolbar";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));

afterEach(cleanup);
beforeEach(() => replace.mockClear());

const search = () => screen.getByLabelText("Rechercher un contact") as HTMLInputElement;
const filter = (name: string) => screen.getByRole("button", { name });

// Lot 10 : la recherche et le filtre vivent dans l'adresse de la page.
describe("couche présentation · BoardToolbar (lot 10)", () => {
  // Critère 1 : la saisie met l'adresse à jour, peu après la frappe.
  it("met la recherche dans l'adresse de la page", async () => {
    render(<BoardToolbar view={{ q: "", filtre: "tous" }} />);

    fireEvent.change(search(), { target: { value: "lumen" } });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/?q=lumen", { scroll: false }));
  });

  it("retire la recherche de l'adresse quand le champ est vidé, en gardant le filtre", async () => {
    render(<BoardToolbar view={{ q: "lumen", filtre: "a-relancer" }} />);

    fireEvent.change(search(), { target: { value: "" } });

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/?filtre=a-relancer", { scroll: false }));
  });

  // Critère 2 : les trois filtres, l'actif est marqué ; un clic met l'adresse à jour, la recherche est gardée.
  it("marque le filtre actif et change de filtre en gardant la recherche", () => {
    render(<BoardToolbar view={{ q: "lumen", filtre: "tous" }} />);

    expect(filter("Tous").getAttribute("aria-pressed")).toBe("true");
    expect(filter("À relancer").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(filter("À relancer"));
    expect(replace).toHaveBeenCalledWith("/?q=lumen&filtre=a-relancer", { scroll: false });

    fireEvent.click(filter("En attente de réponse"));
    expect(replace).toHaveBeenCalledWith("/?q=lumen&filtre=en-attente", { scroll: false });
  });

  it("« Tous » retire le filtre de l'adresse", () => {
    render(<BoardToolbar view={{ q: "", filtre: "en-attente" }} />);

    fireEvent.click(filter("Tous"));

    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  // Critère 5 : après un rechargement, le champ et le filtre reprennent la vue de l'adresse.
  it("reprend la recherche et le filtre de l'adresse", () => {
    render(<BoardToolbar view={{ q: "inès", filtre: "en-attente" }} />);

    expect(search().value).toBe("inès");
    expect(filter("En attente de réponse").getAttribute("aria-pressed")).toBe("true");
  });

  // Critère 4 : « Effacer la recherche » vide l'adresse ; le champ se vide aussi.
  it("vide le champ quand la recherche est effacée ailleurs", () => {
    const { rerender } = render(<BoardToolbar view={{ q: "lumen", filtre: "tous" }} />);

    rerender(<BoardToolbar view={{ q: "", filtre: "tous" }} />);

    expect(search().value).toBe("");
  });
});
