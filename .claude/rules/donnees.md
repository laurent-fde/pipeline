---
paths:
  - "src/data/**"
---
# Couche données

Lecture et écriture en base (`src/data/`).

- Seule couche qui parle à la base : le client de base n'est importé que dans `src/data/`.
- Expose une interface (`XRepository`) et une fonction de création (`createXRepository()`).
- Aucune règle métier : elle lit et écrit, sans rien décider.
- Ne dépend de personne : n'importe ni le service ni la présentation.
- Changer de base (SQLite → Turso) ne modifie que ce dossier.

✅ `findAll()`, `insert(contact)`, `updateStage(id, stage)`
❌ `insert(contact)` qui refuse un nom vide (c'est le rôle du service)

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de `@/services` ou `@/presentation` ici.
- Le client de base n'apparaît que dans `src/data/` : `grep -rln "<client de base>" src | grep -v "^src/data/"` ne renvoie rien.
