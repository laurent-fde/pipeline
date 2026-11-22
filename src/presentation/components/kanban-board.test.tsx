import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board, BoardContact } from "@/services/contact.service";
import { allowedMoves, dropTargets, reopenTargets } from "@/services/stages";
import { KanbanBoard } from "./kanban-board";

// Lot 10 : « Effacer la recherche » change l'adresse de la page.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/" }));

afterEach(cleanup);

const LABELS = [
  ["nouveau", "Nouveau"],
  ["contacte", "Contacté"],
  ["rdv", "RDV"],
  ["proposition", "Proposition"],
  ["gagne", "Gagné"],
  ["perdu", "Perdu"],
] as const;

const contact = (id: string, name: string, stage: string): BoardContact => ({
  id,
  name,
  company: null,
  email: null,
  phone: null,
  stage,
  followUpOn: null,
  awaitingReply: false,
  createdAt: "2026-11-20T10:00:00.000Z",
  followUp: null,
});

function board(contacts: BoardContact[], view: Board["view"] = { q: "", filtre: "tous" }, total = contacts.length): Board {
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
  return { columns, total, visible: contacts.length, view };
}

const column = (label: string) => screen.getByRole("region", { name: label });
const card = (name: string) => screen.getByRole("heading", { name, level: 4 }).closest("li") as HTMLElement;
// La fiche s'ouvre en cliquant sur le nom du contact (lot 9).
const openSheet = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("couche présentation · KanbanBoard", () => {
  // Lot 2 · Critère 1 : colonnes Nouveau, Contacté, RDV, Proposition, Gagné et Perdu, dans cet ordre.
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

  // Lot 2 · Critère 2 : un contact à l'étape « nouveau » est dans la colonne Nouveau.
  it("place chaque contact dans la colonne de son étape", () => {
    render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "rdv")])} />,
    );

    expect(within(column("Nouveau")).getByText("Claire Martin")).toBeDefined();
    expect(within(column("Nouveau")).queryByText("Paul Durand")).toBeNull();
    expect(within(column("RDV")).getByText("Paul Durand")).toBeDefined();
  });

  // Lot 2 · Critère 3 : chaque colonne indique son nombre de contacts.
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

  // Lot 2 · Critère 4 : aucun contact, un message invite à ajouter le premier contact.
  it("invite à ajouter le premier contact quand il n'y en a aucun, colonnes comprises", () => {
    render(<KanbanBoard board={board([])} />);

    expect(screen.getByText(/ajoute ton premier contact/i)).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("n'affiche plus l'invitation dès qu'il y a un contact", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(screen.queryByText(/ajoute ton premier contact/i)).toBeNull();
  });

  // Lot 9 · Critère 6 : une colonne vide l'annonce et invite à y glisser une carte.
  it("annonce une colonne vide", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} />);

    expect(within(column("RDV")).getByText(/Aucun contact/)).toBeDefined();
    expect(within(column("RDV")).getByText(/Glisse une carte ici/)).toBeDefined();
    expect(within(column("Nouveau")).queryByText(/Aucun contact/)).toBeNull();
  });

  // Lot 9 · Critère 6 : chaque étape a sa couleur (six couleurs du thème, toutes différentes) ; Gagné et Perdu plus discrètes.
  it("donne sa couleur à chaque étape et rend Gagné et Perdu plus discrètes", () => {
    render(<KanbanBoard board={board([])} />);

    const colors = LABELS.map(([, label]) => column(label).className.match(/border-t-chart-\d/)?.[0]);
    expect(colors.every(Boolean)).toBe(true);
    expect(new Set(colors).size).toBe(6);
    expect(column("Gagné").dataset.closed).toBe("true");
    expect(column("Perdu").dataset.closed).toBe("true");
    expect(column("Nouveau").dataset.closed).toBeUndefined();
  });

  // Lot 3 · Critère 4 et lot 9 · Critère 4 : la carte porte un seul bouton, « étape suivante », s'il est permis.
  it("met un bouton « étape suivante » sur la carte seulement quand le déplacement est permis", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "gagne")])}
        moveAction={vi.fn()}
      />,
    );

    expect(within(card("Claire Martin")).getByRole("button", { name: "Passer Claire Martin à l'étape suivante" })).toBeDefined();
    expect(within(card("Paul Durand")).queryByRole("button", { name: /étape suivante/ })).toBeNull();
  });

  it("demande l'étape suivante au service depuis la carte", async () => {
    const moveAction = vi.fn(async () => ({}));
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} moveAction={moveAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Passer Claire Martin à l'étape suivante" }));

    await vi.waitFor(() => expect(moveAction).toHaveBeenCalledWith("1", "next"));
  });

  // Lot 9 · Critère 5 et #16 : la fiche reçoit les déplacements et les cibles de « Rouvrir vers… » de la colonne.
  it("propose « Rouvrir vers… » dans la fiche d'un contact Perdu, pas dans celle d'un contact RDV", () => {
    render(
      <KanbanBoard
        board={board([contact("1", "Claire Martin", "perdu"), contact("2", "Paul Durand", "rdv")])}
        moveAction={vi.fn()}
        reopenAction={vi.fn()}
      />,
    );

    openSheet("Claire Martin");
    expect(screen.getByRole("button", { name: /Rouvrir vers/ })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    openSheet("Paul Durand");
    expect(screen.queryByRole("button", { name: /Rouvrir vers/ })).toBeNull();
  });

  // Revue du lot 9 : changer d'étape depuis la fiche la laisse ouverte, sur la nouvelle étape.
  it("garde la fiche ouverte quand le contact change de colonne", async () => {
    const moveAction = vi.fn(async () => ({}));
    const { rerender } = render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} moveAction={moveAction} />,
    );

    openSheet("Claire Martin");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Étape suivante" }));
    await vi.waitFor(() => expect(moveAction).toHaveBeenCalledWith("1", "next"));

    rerender(<KanbanBoard board={board([contact("1", "Claire Martin", "contacte")])} moveAction={moveAction} />);

    const sheet = screen.getByRole("dialog", { name: "Claire Martin" });
    expect(within(sheet).getByText("Contacté")).toBeDefined();
  });

  it("referme la fiche quand le contact n'existe plus", () => {
    const { rerender } = render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} moveAction={vi.fn()} />,
    );

    openSheet("Claire Martin");
    rerender(<KanbanBoard board={board([])} moveAction={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("n'active pas « Étape précédente » dans la fiche d'un contact Gagné", () => {
    render(
      <KanbanBoard board={board([contact("1", "Claire Martin", "gagne")])} moveAction={vi.fn()} reopenAction={vi.fn()} />,
    );

    openSheet("Claire Martin");
    expect((screen.getByRole("button", { name: "Étape précédente" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

// Lot 8 : glisser-déposer une carte sur une autre colonne. Lot 9 : seule la poignée lance le glissement.
describe("couche présentation · KanbanBoard · glisser-déposer (lots 8 et 9)", () => {
  const dataTransfer = () => ({ setData: vi.fn(), getData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "", dropEffect: "" });
  const handle = (name: string) => within(card(name)).getByTitle(`Glisser ${name} vers une autre colonne`);
  const startDrag = (name: string) => fireEvent.dragStart(handle(name), { dataTransfer: dataTransfer() });
  const contacts = [contact("1", "Claire Martin", "nouveau"), contact("2", "Paul Durand", "rdv")];

  it("ne propose la poignée de glissement que quand le dépôt est branché", () => {
    const { unmount } = render(<KanbanBoard board={board(contacts)} />);
    expect(within(card("Claire Martin")).queryByTitle(/Glisser/)).toBeNull();
    unmount();

    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);
    expect(handle("Claire Martin").getAttribute("draggable")).toBe("true");
  });

  // Lot 9 · Critère 7 (#29) : le reste de la carte n'est pas déplaçable.
  it("ne rend déplaçable que la poignée, pas le reste de la carte", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    expect(card("Claire Martin").getAttribute("draggable")).not.toBe("true");
  });

  // Lot 8 · Critère 2 : pendant le glissement, les colonnes permises sont mises en évidence (#30 : classe vérifiée).
  it("met en évidence les colonnes où déposer la carte pendant le glissement", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    startDrag("Claire Martin");

    expect(column("Contacté").dataset.drop).toBe("allowed");
    expect(column("Contacté").className).toContain("outline-primary");
    expect(column("Perdu").dataset.drop).toBe("allowed");
    expect(column("RDV").dataset.drop).toBe("refused");
    expect(column("RDV").className).toContain("opacity-50");
    expect(column("Nouveau").dataset.drop).toBe("source");

    fireEvent.dragEnd(handle("Claire Martin"));
    expect(column("Contacté").dataset.drop).toBeUndefined();
  });

  // Lot 9 · Critère 7 (#29) : la mise en évidence au survol s'éteint en quittant la colonne.
  it("éteint la mise en évidence au survol quand la carte quitte la colonne", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    startDrag("Claire Martin");
    fireEvent.dragOver(column("Contacté"), { dataTransfer: dataTransfer() });
    expect(column("Contacté").dataset.over).toBe("true");

    fireEvent.dragLeave(column("Contacté"), { relatedTarget: document.body });
    expect(column("Contacté").dataset.over).toBeUndefined();
  });

  // Lot 8 · Critère 1 : déposer sur une colonne permise demande le déplacement au service.
  it("demande le déplacement quand la carte est déposée sur une autre colonne", async () => {
    const dropAction = vi.fn(async () => ({}));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    startDrag("Claire Martin");
    fireEvent.dragOver(column("Contacté"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });

    await vi.waitFor(() => expect(dropAction).toHaveBeenCalledWith("1", "contacte"));
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  // Lot 8 · Critère 3 : un dépôt refusé par le service est annoncé, la carte reste dans sa colonne.
  it("annonce le refus d'un dépôt sur une colonne non permise", async () => {
    const dropAction = vi.fn(async () => ({ error: "Ce déplacement n'est pas possible" }));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    startDrag("Claire Martin");
    fireEvent.drop(column("RDV"), { dataTransfer: dataTransfer() });

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Ce déplacement n'est pas possible"));
    expect(dropAction).toHaveBeenCalledWith("1", "rdv");
    expect(within(column("Nouveau")).getByText("Claire Martin")).toBeDefined();
  });

  it("ne fait rien quand la carte est reposée dans sa propre colonne", () => {
    const dropAction = vi.fn(async () => ({}));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    startDrag("Claire Martin");
    fireEvent.drop(column("Nouveau"), { dataTransfer: dataTransfer() });

    expect(dropAction).not.toHaveBeenCalled();
  });

  // Lot 8 · Critère 5 : les boutons d'étape restent, sur la carte et dans la fiche, pour le clavier et le tactile.
  it("garde les boutons d'étape sur les cartes déplaçables et dans leur fiche", () => {
    render(<KanbanBoard board={board(contacts)} moveAction={vi.fn()} dropAction={vi.fn()} />);

    expect(within(card("Claire Martin")).getByRole("button", { name: /étape suivante/ })).toBeDefined();
    openSheet("Claire Martin");
    expect(screen.getByRole("button", { name: "Étape suivante" })).toBeDefined();
  });

  // #27 : pendant l'enregistrement d'un dépôt, un second dépôt est ignoré.
  it("ignore un second dépôt tant que le premier est en cours d'enregistrement", async () => {
    let finish: (state: { error?: string }) => void = () => {};
    const dropAction = vi.fn(() => new Promise<{ error?: string }>((resolve) => (finish = resolve)));
    render(<KanbanBoard board={board(contacts)} dropAction={dropAction} />);

    startDrag("Claire Martin");
    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(handle("Claire Martin").getAttribute("draggable")).toBe("false"));

    startDrag("Claire Martin");
    fireEvent.drop(column("Perdu"), { dataTransfer: dataTransfer() });
    expect(dropAction).toHaveBeenCalledTimes(1);

    finish({});
    await vi.waitFor(() => expect(handle("Claire Martin").getAttribute("draggable")).toBe("true"));
  });

  // #27 : si la fin du glissement n'arrive pas à la carte (carte retirée), la fenêtre remet tout à zéro.
  it("remet le tableau à zéro quand la fin du glissement arrive sur la fenêtre", () => {
    render(<KanbanBoard board={board(contacts)} dropAction={vi.fn()} />);

    startDrag("Claire Martin");
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

    startDrag("Claire Martin");
    fireEvent.drop(column("RDV"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Ce déplacement n'est pas possible"));

    startDrag("Claire Martin");
    expect(screen.getByRole("alert").textContent).toBe("Ce déplacement n'est pas possible");

    fireEvent.drop(column("Contacté"), { dataTransfer: dataTransfer() });
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toBe(""));
  });
});

describe("couche présentation · KanbanBoard · erreur du bouton « étape suivante » (revue du lot 9)", () => {
  it("affiche l'erreur à l'écran, sous le bouton de la carte", async () => {
    const moveAction = vi.fn(async () => ({ error: "Impossible de déplacer le contact, réessaie." }));
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")])} moveAction={moveAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Passer Claire Martin à l'étape suivante" }));

    await vi.waitFor(() =>
      expect(within(card("Claire Martin")).getByRole("status").textContent).toBe("Impossible de déplacer le contact, réessaie."),
    );
  });
});

// Lot 10 : tableau filtré.
describe("couche présentation · KanbanBoard · recherche et filtres (lot 10)", () => {
  // Critère 4 : rien ne correspond → un message et un bouton qui remet le tableau complet.
  it("annonce qu'aucun contact ne correspond, et « Effacer la recherche » remet le tableau complet", () => {
    replace.mockClear();
    render(<KanbanBoard board={board([], { q: "zzz", filtre: "a-relancer" }, 3)} />);

    expect(screen.getByText("Aucun contact ne correspond")).toBeDefined();
    expect(screen.queryByText(/ajoute ton premier contact/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("n'annonce rien quand le tableau filtré a des contacts", () => {
    render(<KanbanBoard board={board([contact("1", "Claire Martin", "nouveau")], { q: "claire", filtre: "tous" }, 3)} />);

    expect(screen.queryByText("Aucun contact ne correspond")).toBeNull();
  });

  // Critère 6 : sur un tableau filtré, le glisser-déposer et la fiche fonctionnent.
  it("garde le glisser-déposer et la fiche sur un tableau filtré", async () => {
    const dropAction = vi.fn(async () => ({}));
    const filtered = board([contact("1", "Claire Martin", "nouveau")], { q: "claire", filtre: "tous" }, 3);
    render(<KanbanBoard board={filtered} moveAction={vi.fn()} dropAction={dropAction} />);
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(within(card("Claire Martin")).getByTitle("Glisser Claire Martin vers une autre colonne"), { dataTransfer });
    fireEvent.drop(column("Contacté"), { dataTransfer });
    await vi.waitFor(() => expect(dropAction).toHaveBeenCalledWith("1", "contacte"));

    openSheet("Claire Martin");
    expect(screen.getByRole("dialog", { name: "Claire Martin" })).toBeDefined();
  });
});
