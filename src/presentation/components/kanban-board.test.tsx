import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board, Contact } from "@/services/contact.service";
import { allowedMoves, dropTargets, reopenTargets } from "@/services/stages";
import { KanbanBoard } from "./kanban-board";

afterEach(cleanup);

const LABELS = [
  ["nouveau", "Nouveau"],
  ["contacte", "Contacté"],
  ["rdv", "RDV"],
  ["proposition", "Proposition"],
  ["gagne", "Gagné"],
  ["perdu", "Perdu"],
] as const;

const contact = (id: string, name: string, stage: string): Contact => ({
  id,
  name,
  company: null,
  email: null,
  phone: null,
  stage,
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
});

function board(contacts: Contact[]): Board {
  const columns = LABELS.map(([stage, label]) => {
    const inColumn = contacts.filter((c) => c.stage === stage);
    // Les vraies règles de stages.ts, pour que la fixture ne dérive plus du service (#16).
    return {
      stage,
      label,
      count: inColumn.length,
      contacts: inColumn,
      moves: allowedMoves(stage),
      reopenTargets: reopenTargets(stage),
      dropTargets: dropTargets(stage),
    };
  });
  return { columns, total: contacts.length };
}

const column = (label: string) => screen.getByRole("region", { name: label });

describe("couche présentation · KanbanBoard", () => {
  // Critère 1 : colonnes Nouveau, Contacté, RDV, Proposition, Gagné et Perdu, dans cet ordre.
  it("affiche les six colonnes dans l'ordre", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Nouveau",
      "Contacté",
      "RDV",
      "Proposition",
      "Gagné",
      "Perdu",
    ]);
  });

  // Critère 2 : un contact à l'étape « nouveau » est dans la colonne Nouveau.
  it("place chaque contact dans la colonne de son étape", () => {
    render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "rdv")])} />,
    );

    expect(within(column("Nouveau")).getByText("Claire Martin")).toBeDefined();
    expect(within(column("Nouveau")).queryByText("Paul Durand")).toBeNull();
    expect(within(column("RDV")).getByText("Paul Durand")).toBeDefined();
  });

  // Critère 3 : chaque colonne indique son nombre de contacts.
  it("indique le nombre de contacts de chaque colonne, zéro compris", () => {
    render(
      <KanbanBoard
        board={board([
          contact("1", "Claire Martin", "nouveau"),
          contact("2", "Paul Durand", "nouveau"),
          contact("3", "Inès Roy", "rdv"),
        ])}
      />,
    );

    expect(within(column("Nouveau")).getByLabelText("2 contacts")).toBeDefined();
    expect(within(column("RDV")).getByLabelText("1 contact")).toBeDefined();
    expect(within(column("Perdu")).getByLabelText("0 contact")).toBeDefined();
  });

  // Critère 4 : aucun contact, un message invite à ajouter le premier contact.
  it("invite à ajouter le premier contact quand il n'y en a aucun, colonnes comprises", () => {
    render(<KanbanBoard board={board([])} />);

    expect(screen.getByText(/ajoute ton premier contact/i)).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("n'affiche plus l'invitation dès qu'il y a un contact", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(screen.queryByText(/ajoute ton premier contact/i)).toBeNull();
  });

  // Lot 3 · Critère 4 : sur la carte d'un contact Gagné, « Étape suivante » est indisponible.
  it("affiche les boutons d'étape sur chaque carte, selon les déplacements permis de la colonne", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "gagne")])}
        moveAction={vi.fn()}
      />,
    );

    const suivante = (label: string) =>
      within(column(label)).getByRole("button", { name: "Étape suivante" }) as HTMLButtonElement;
    expect(suivante("Nouveau").disabled).toBe(false);
    expect(suivante("Gagné").disabled).toBe(true);
  });

  // #16 : les cibles de « Rouvrir vers… » de la colonne arrivent jusqu'aux cartes.
  it("propose « Rouvrir vers… » sur une carte Perdu, pas sur une carte RDV", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "perdu"), contact("2", "Paul Durand", "rdv")])}
        moveAction={vi.fn()}
        reopenAction={vi.fn()}
      />,
    );

    expect(within(column("Perdu")).getByRole("button", { name: /Rouvrir vers/ })).toBeDefined();
    expect(within(column("RDV")).queryByRole("button", { name: /Rouvrir vers/ })).toBeNull();
  });

  it("n'active pas « Étape précédente » sur une carte Gagné ou Perdu", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "gagne"), contact("2", "Paul Durand", "perdu")])}
        moveAction={vi.fn()}
        reopenAction={vi.fn()}
      />,
    );

    for (const label of ["Gagné", "Perdu"]) {
      const precedente = within(column(label)).queryByRole("button", { name: "Étape précédente" }) as HTMLButtonElement | null;
      expect(precedente === null || precedente.disabled).toBe(true);
    }
  });
});

// Lot 8 : glisser-déposer une carte sur une autre colonne.
describe("couche présentation · KanbanBoard · glisser-déposer (lot 8)", () => {
  const dataTransfer = () => ({ setData: vi.fn(), getData: vi.fn(), effectAllowed: "", dropEffect: "" });
  const card = (name: string) => screen.getByText(name).closest("li") as HTMLElement;
  const contacts = [contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "rdv")];

  it("rend les cartes déplaçables seulement quand le dépôt est branché", () => {
    const { unmount } = render(<KanbanBoard board={board(contacts)} />);
    expect(card("Claire Martin").getAttribute("draggable")).not.toBe("true");
    unmount();

    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);
    expect(card("Claire Martin").getAttribute("draggable")).toBe("true");
  });

  // Critère 2 : pendant le glissement, les colonnes permises sont mises en évidence.
  it("met en évidence les colonnes où déposer la carte pendant le glissement", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });

    expect(column("Contacté").dataset.drop).toBe("allowed");
    expect(column("Perdu").dataset.drop).toBe("allowed");
    expect(column("RDV").dataset.drop).toBe("refused");
    expect(column("Nouveau").dataset.drop).toBe("source");

    fireEvent.dragEnd(card("Claire Martin"));
    expect(column("Contacté").dataset.drop).toBeUndefined();
  });

  // Critère 1 : déposer sur une colonne permise demande le déplacement au service.
  it("demande le déplacement quand la carte est déposée sur une autre colonne", async () => {
    const dropAction = vi.fn(async () => ({}));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Contacté"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });

    await vi.waitFor(() => expect(dropAction).toHaveBeenCalledWith("1", "contacte"));
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  // Critère 3 : un dépôt refusé par le service est annoncé, la carte reste dans sa colonne.
  it("annonce le refus d'un dépôt sur une colonne non permise", async () => {
    const dropAction = vi.fn(async () => ({ error: "Ce déplacement n'est pas possible" }));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("RDV"), { dataTransfer: dataTransfer() });

    expect((await screen.findByRole("alert")).textContent).toBe("Ce déplacement n'est pas possible");
    expect(dropAction).toHaveBeenCalledWith("1", "rdv");
    expect(within(column("Nouveau")).getByText("Claire Martin")).toBeDefined();
  });

  it("ne fait rien quand la carte est reposée dans sa propre colonne", () => {
    const dropAction = vi.fn(async () => ({}));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Nouveau"), { dataTransfer: dataTransfer() });

    expect(dropAction).not.toHaveBeenCalled();
  });

  // Critère 5 : les boutons d'étape restent là, pour le clavier et le tactile.
  it("garde les boutons d'étape sur les cartes déplaçables", () => {
    render(<KanbanBoard board={board(contacts)} moveAction={vi.fn()} dropAction={vi.fn()} />);

    expect(within(card("Claire Martin")).getByRole("button", { name: "Étape suivante" })).toBeDefined();
  });

  // #27 : pendant l'enregistrement d'un dépôt, un second dépôt est ignoré.
  it("ignore un second dépôt tant que le premier est en cours d'enregistrement", async () => {
    let finish: (state: { error?: string }) => void = () => {};
    const dropAction = vi.fn(() => new Promise<{ error?: string }>((resolve) => (finish = resolve)));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(card("Claire Martin").getAttribute("draggable")).toBe("false"));

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Perdu"), { dataTransfer: dataTransfer() });
    expect(dropAction).toHaveBeenCalledTimes(1);

    finish({});
    await vi.waitFor(() => expect(card("Claire Martin").getAttribute("draggable")).toBe("true"));
  });

  // #27 : si la fin du glissement n'arrive pas à la carte (carte retirée), la fenêtre remet tout à zéro.
  it("remet le tableau à zéro quand la fin du glissement arrive sur la fenêtre", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    expect(column("Contacté").dataset.drop).toBe("allowed");

    fireEvent(window, new Event("dragend"));
    expect(column("Contacté").dataset.drop).toBeUndefined();
  });

  // #28 : la place du message est réservée, et il n'est pas effacé au début d'un glissement.
  it("garde le message à sa place au début d'un nouveau glissement, et l'efface au dépôt suivant", async () => {
    const dropAction = vi
      .fn<(id: string, stage: string) => Promise<{ error?: string }>>()
      .mockResolvedValueOnce({ error: "Ce déplacement n'est pas possible" })
      .mockResolvedValueOnce({});
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);
    const alert = screen.getByRole("alert");

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("RDV"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(alert.textContent).toBe("Ce déplacement n'est pas possible"));

    fireEvent.dragStart(card("Claire Martin"), { dataTransfer: dataTransfer() });
    expect(screen.getByRole("alert").textContent).toBe("Ce déplacement n'est pas possible");

    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toBe(""));
  });
});
