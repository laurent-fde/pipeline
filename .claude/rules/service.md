---
paths:
  - "src/services/**"
---
# Couche service

Règles métier et validation (`src/services/`).

- Porte toutes les règles métier et valide toutes les données reçues, même si le formulaire les a déjà vérifiées : une action serveur peut être appelée sans l'écran.
- Reçoit la couche données en paramètre : `createXService(repository)`. Seule `getXService()` importe la couche données concrète.
- N'importe rien de l'interface : ni React, ni `next/*`, ni `@/presentation`.
- « Aujourd'hui » (relances) se calcule en Europe/Paris, à un seul endroit du service, jamais dans un composant.
- Tests écrits AVANT le code : un test rouge, puis le code qui le fait passer. Les tests utilisent une fausse couche données, jamais une vraie base.

✅ `if (!input.name.trim()) throw new Error("Le nom est obligatoire")` dans le service
❌ Le nom vérifié seulement par `required` dans le formulaire

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de React, `next/*` ou `@/presentation` ici.
- Chaque `*.service.ts` a son `*.service.test.ts` à côté, et `pnpm test` passe.
- Dans l'historique de la PR, le commit des tests précède celui du code.
