---
paths:
  - "src/data/**"
---
# Couche données

Lecture et écriture en base (`src/data/`).

- Seule couche qui parle à la base : le client `@libsql/client` n'est importé que dans `src/data/`, et ouvert une seule fois dans `db.ts`.
- Changer le schéma = ajouter une migration à la fin de la liste de `db.ts`, jamais modifier une migration existante.
- Tests sur une vraie base libsql en mémoire (`openDatabase(":memory:")`) ou sur un fichier temporaire.
- Expose une interface (`XRepository`) et une fonction de création (`createXRepository()`).
- Aucune règle métier : elle lit et écrit, sans rien décider.
- Ne dépend de personne : n'importe ni le service ni la présentation.
- Changer de base (SQLite → Turso) ne modifie que ce dossier.

✅ `findAll()`, `insert(contact)`, `updateStage(id, stage)`
❌ `insert(contact)` qui refuse un nom vide (c'est le rôle du service)

## Comment vérifier
- `pnpm lint` passe : il refuse tout import de `@/services` ou `@/presentation` ici.
- `pnpm lint` refuse aussi tout import de `@libsql/*` hors de `src/data/`.
- Le client n'apparaît que dans `src/data/` : `grep -rln "@libsql/client" src | grep -v "^src/data/"` ne renvoie rien.
