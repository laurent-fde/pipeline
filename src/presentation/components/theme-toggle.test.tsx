import { act, cleanup, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

// Le serveur ne connaît pas le thème (resolvedTheme vaut undefined) ; le navigateur, si.
let resolvedTheme: string | undefined;
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme, setTheme: vi.fn() }) }));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("couche présentation · ThemeToggle (bug #10)", () => {
  it("s'hydrate sans écart entre le serveur et un navigateur en mode sombre", async () => {
    resolvedTheme = undefined;
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeToggle />);
    document.body.appendChild(container);

    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    resolvedTheme = "dark";
    await act(async () => {
      hydrateRoot(container, <ThemeToggle />, { onRecoverableError: (error) => console.error(error) });
    });

    expect(errors).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Passer en mode clair" })).toBeTruthy();
  });
});
