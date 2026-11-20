import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactList } from "./contact-list";

afterEach(cleanup);

const claire = {
  id: "1",
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: "06 12 34 56 78",
  createdAt: "2026-11-20T10:00:00.000Z",
};

describe("couche présentation · ContactList", () => {
  // Critère 1 : le contact apparaît dans la liste avec ses informations.
  it("affiche chaque contact avec ses informations", () => {
    render(<ContactList contacts={[claire]} />);

    const carte = screen.getByRole("listitem");
    expect(within(carte).getByText("Claire Martin")).toBeDefined();
    expect(within(carte).getByText("Atelier Lumen")).toBeDefined();
    expect(within(carte).getByText("claire@lumen.fr")).toBeDefined();
    expect(within(carte).getByText("06 12 34 56 78")).toBeDefined();
  });

  it("n'affiche pas les informations absentes", () => {
    render(<ContactList contacts={[{ ...claire, company: null, email: null, phone: null }]} />);

    const carte = screen.getByRole("listitem");
    expect(within(carte).getByText("Claire Martin")).toBeDefined();
    expect(within(carte).queryByText("Atelier Lumen")).toBeNull();
  });

  it("garde l'ordre reçu", () => {
    render(<ContactList contacts={[{ ...claire, id: "2", name: "Second" }, claire]} />);

    expect(screen.getAllByRole("listitem").map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "Second",
      "Claire Martin",
    ]);
  });
});
