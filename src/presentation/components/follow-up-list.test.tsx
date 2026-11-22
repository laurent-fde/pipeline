import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Contact } from "@/services/contact.service";
import { FollowUpList } from "./follow-up-list";

afterEach(cleanup);

const contact = (id: string, name: string, followUpOn: string): Contact => ({
  id,
  name,
  company: "Atelier Lumen",
  email: null,
  phone: null,
  stage: "rdv",
  followUpOn,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
});

describe("couche présentation · FollowUpList (lot 4)", () => {
  // Critère 1 : le contact à relancer aujourd'hui apparaît dans « À relancer ».
  it("liste les contacts à relancer", () => {
    render(<FollowUpList followUps={[{ contact: contact("1", "Claire Martin", "2026-11-21"), overdue: false }]} />);

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Claire Martin")).toBeDefined();
    expect(within(item).getByText("Atelier Lumen")).toBeDefined();
    expect(within(item).queryByText("en retard")).toBeNull();
  });

  // Critère 2 : une relance passée porte l'indication « en retard ».
  it("indique « en retard » sur une relance passée", () => {
    render(<FollowUpList followUps={[{ contact: contact("1", "Paul Durand", "2026-11-18"), overdue: true }]} />);

    expect(within(screen.getByRole("listitem")).getByText("en retard")).toBeDefined();
  });

  // Critère 4 : aucune relance due, « Personne à relancer aujourd'hui ».
  it("affiche « Personne à relancer aujourd'hui » quand la liste est vide", () => {
    render(<FollowUpList followUps={[]} />);

    expect(screen.getByText("Personne à relancer aujourd'hui")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  // Lot 5 · Critère 1 : « Relance faite » envoie le contact concerné.
  it("propose « Relance faite » pour chaque contact et envoie son identifiant", async () => {
    const doneAction = vi.fn(async () => ({}));
    render(
      <FollowUpList
        followUps={[{ contact: contact("7", "Claire Martin", "2026-11-21"), overdue: false }]}
        doneAction={doneAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Relance faite pour Claire Martin" }));

    await vi.waitFor(() => expect(doneAction).toHaveBeenCalledWith("7"));
  });

  it("annonce l'erreur renvoyée par l'action", async () => {
    const doneAction = vi.fn(async () => ({ error: "Impossible d'enregistrer la relance, réessaie." }));
    render(
      <FollowUpList
        followUps={[{ contact: contact("7", "Claire Martin", "2026-11-21"), overdue: false }]}
        doneAction={doneAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Relance faite pour Claire Martin" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Impossible d'enregistrer la relance, réessaie.");
  });
});

