---
name: lot
description: Traiter un lot de lots.md selon le process du projet : plan validé, TDD, preuves, puis proposition de PR. Utiliser quand l'utilisateur tape « /lot N » ou demande de traiter un lot.
---

# lot · notre façon de développer un lot

Ce skill définit le process du projet. Il s'applique à chaque lot, sans le redire.
Argument : le numéro du lot ($ARGUMENTS).

## 1. Préparer
- Travaille sur la branche dev, à jour avec main : `git checkout dev && git pull origin main`.
- Lis le lot $ARGUMENTS dans lots.md, puis INTENT.md et les règles de .claude/rules/.

## 2. Planifier, puis attendre ma validation
- Les tâches, couche par couche : présentation, service, données.
- Pour chaque critère d'acceptation : le ou les tests qui le prouvent, et la couche testée.
- Si un critère est flou ou impossible à tester, signale-le.
- STOP : attends ma validation du plan et des critères avant d'écrire.

## 3. Exécuter en TDD
- Écris d'abord les tests. Ils couvrent les trois couches : service, présentation, données.
- Lance `pnpm test` : ils échouent. Garde cette sortie rouge.
- Écris le code, couche par couche, jusqu'à ce que `pnpm test` passe.
- Un seul commit pour le lot : `feat(lot-$ARGUMENTS): <titre du lot>`.

## 4. Vérifier
- `pnpm test`, `pnpm typecheck`, `pnpm lint` et `pnpm build` passent.
- Chaque critère a son test.
- La sortie rouge a été vue avant le code.
- Les règles de .claude/rules/ sont respectées.
- Vérification écran en clair ET en sombre, dans le navigateur (`pnpm dev`, bouton ☀️/🌙), avec une capture de chaque mode. Une seule fois par lot, quand les tests sont verts et avant la PR, si le lot touche `src/app/`, `src/presentation/` ou `globals.css`. Pas après chaque modification. Regarde aussi la console (erreurs, avertissements Next.js) et la largeur (rien de coupé, pas de défilement inutile).
- Auto-relecture du diff (`git diff main...dev`) avec les 4 points de contrôle de la relecture de PR :
  1. la présentation n'appelle jamais la couche données ;
  2. chaque service modifié a ses tests ;
  3. seule la couche données parle à la base ;
  4. les composants viennent du design system, sans couleur en dur.
  Un point non tenu : corrige avant d'ouvrir la PR.

## 5. Ouvrir la PR
- Une fois tous les tests verts, ouvre la PR de dev vers main (`gh pr create`) et donne-moi le lien.
- Dans le corps : `Closes #N` (l'issue du lot), les critères cochés, le test de chaque critère, la sortie rouge puis la sortie verte de `pnpm test`, et les 4 points de contrôle (tenu, ou corrigé).

## Mode enchaînement (« enchaîne les lots restants »)
Quand on me demande d'enchaîner plusieurs lots :
- Traite les lots dans l'ordre de lots.md, chacun avec les étapes 1 à 4.
- Pas d'arrêt pour valider le plan : écris-le dans ta réponse, puis continue. La relecture de la PR devient le seul contrôle.
- Arrête-toi seulement sur une anomalie majeure : critère impossible ou contradictoire, test qui ne peut pas passer sans sortir du lot, migration qui casse des données, règle de .claude/rules/ impossible à tenir.
- Un commit par lot : `feat(lot-N): <titre du lot>`. Garde la sortie rouge de chaque lot.
- À la fin, une seule PR pour tous les lots, avec un récap par lot : critères cochés et leurs tests, sortie rouge du lot, puis une sortie verte finale, et les 4 points de contrôle.

## Nomenclature des commits
- `feat(lot-N): <titre du lot>` : un lot.
- `fix(lot-N): <ce qui est corrigé>` : une correction.
- `chore: <quoi>` : mise en place, outillage.
- `docs: <quoi>` : documentation.

## Règles
- Ne sors pas du lot. Une idée hors lot : signale-la, ne la code pas.
- Ne fusionne jamais : la fusion est à moi.
