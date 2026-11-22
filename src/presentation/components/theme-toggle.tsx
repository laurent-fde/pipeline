"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/presentation/components/ui/button";

const subscribe = () => () => {};

// Vrai seulement dans le navigateur, après l'hydratation : le serveur ne connaît pas le thème choisi.
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = resolvedTheme === "dark";

  // Tant que le thème est inconnu (serveur, premier rendu), un libellé neutre, identique des deux côtés.
  const label = !isClient ? "Changer de thème" : isDark ? "Passer en mode clair" : "Passer en mode sombre";

  return (
    <Button variant="outline" size="icon" aria-label={label} onClick={() => setTheme(isDark ? "light" : "dark")}>
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
