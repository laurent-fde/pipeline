import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactCard } from "./contact-card";

afterEach(cleanup);

const claire = {
  id: "1",
  name: "Claire Martin",
  company: "Atelier Lumen",
  email: "claire@lumen.fr",
  phone: "06 12 34 56 78",
  stage: "nouveau",
  createdAt: "2026-11-20T10:00:00.000Z",
};

describe("couche présentation · ContactCard", () => {
  // Lot 1 · Critère 1 : le contact apparaît avec ses informations.
  it("affiche le contact avec ses informations", () => {
    render(<ContactCard contact={claire} />);

    expect(screen.getByRole("heading", { name: "Claire Martin" })).toBeDefined();
    expect(screen.getByText("Atelier Lumen")).toBeDefined();
    expect(screen.getByText("claire@lumen.fr")).toBeDefined();
    expect(screen.getByText("06 12 34 56 78")).toBeDefined();
  });

  it("n'affiche pas les informations absentes", () => {
    render(<ContactCard contact={{ ...claire, company: null, email: null, phone: null }} />);

    expect(screen.getByRole("heading", { name: "Claire Martin" })).toBeDefined();
    expect(screen.queryByText("Atelier Lumen")).toBeNull();
    expect(screen.queryByText("claire@lumen.fr")).toBeNull();
  });
});
