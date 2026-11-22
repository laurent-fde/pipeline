import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatsBar } from "./stats-bar";

afterEach(cleanup);

const stats = { total: 5, active: 3, due: 2, overdue: 1, waiting: 1, won: 1, lost: 1, winRate: 50 };
const tile = (label: string) => screen.getByRole("group", { name: label });

describe("couche présentation · StatsBar (lot 9)", () => {
  // Lot 9 · Critère 3 : quatre indicateurs, calculés par le service.
  it("affiche les quatre indicateurs", () => {
    render(<StatsBar stats={stats} />);

    expect(tile("Contacts en cours").textContent).toContain("3");
    expect(tile("Contacts en cours").textContent).toContain("sur 5");
    expect(tile("À relancer").textContent).toContain("2");
    expect(tile("À relancer").textContent).toContain("1 en retard");
    expect(tile("En attente de réponse").textContent).toContain("1");
    expect(tile("Taux de gain").textContent).toContain("50 %");
    expect(tile("Taux de gain").textContent).toContain("1 gagné · 1 perdu");
  });

  it("affiche « — » sans contact gagné ni perdu, et rien sur le retard quand il n'y en a pas", () => {
    render(<StatsBar stats={{ ...stats, overdue: 0, won: 0, lost: 0, winRate: null }} />);

    expect(tile("Taux de gain").textContent).toContain("—");
    expect(tile("À relancer").textContent).not.toContain("en retard");
  });
});
