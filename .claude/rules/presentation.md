---
paths:
  - "src/app/**"
  - "src/presentation/**"
---
# Couche présentation

Pages (`src/app/`), actions, composants et providers (`src/presentation/`).

- N'appelle que la couche service (`@/services/...`), jamais `@/data/...`.
- N'utilise que les composants du design system (`src/presentation/components/ui/`). Composant manquant : `pnpm dlx shadcn@latest add <composant>`.
- Aucune couleur en dur : uniquement les variables du thème (`bg-primary`, `text-muted-foreground`, `bg-warning`…).
- Chaque écran fonctionne en clair ET en sombre.
- Aucune règle métier : la validation et les décisions vont dans le service.
- Chaque champ a un `<Label htmlFor>`, et son message d'erreur est relié au champ (`aria-invalid`, `aria-describedby`).

✅ `<Button variant="destructive">Supprimer</Button>`
❌ `<button className="bg-red-500 text-white">Supprimer</button>`

✅ `getContactService().addContact(input)` dans une action
❌ `createContactRepository().insert(input)` dans une action

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de `@/data` ici.
- `grep -rnE "#[0-9a-fA-F]{3,6}|rgb\(|oklch\(|-(red|green|blue|zinc|slate|gray|neutral)-[0-9]" src/app src/presentation --include='*.tsx'` ne renvoie rien.
- L'écran est lisible en clair et en sombre (bouton ☀️/🌙), vérifié dans le navigateur aux moments importants seulement, pas après chaque modification :
  - à la fin d'un lot qui touche l'écran, avant la PR ;
  - après un changement du thème (`globals.css`) ou un nouveau composant shadcn ;
  - quand on corrige un bug visuel.
