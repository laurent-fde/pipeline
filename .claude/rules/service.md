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

- Une saisie refusée n'est pas une panne : renvoyer `{ ok: false, errors }`, et non lever une exception.
- Toute saisie reçue est validée par un schéma Zod (`zod`), avec `safeParse` (jamais `parse`, qui lève une exception). Les erreurs sont mises à plat par champ avec `z.flattenError`. Le type d'entrée reste écrit à la main, tous champs facultatifs : c'est le schéma qui décide.

✅ Le nom vérifié par le schéma du service (« Le nom est obligatoire »), puis `return { ok: false, errors }`
❌ Le nom vérifié seulement par `required` dans le formulaire

✅ `contactSchema.safeParse(input)` puis `z.flattenError(result.error).fieldErrors`
❌ Des `if` écrits à la main pour valider, ou `contactSchema.parse(input)`

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de React, `next/*` ou `@/presentation` ici.
- Chaque `*.service.ts` a son `*.service.test.ts` à côté, et `pnpm test` passe.
- La sortie rouge de `pnpm test` a été montrée avant le code (elle figure dans la PR). Un seul commit par lot.
