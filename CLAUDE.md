# Pipeline

Un mini CRM de prospection, construit lot par lot.

@AGENTS.md

## Avant tout travail
- Lis INTENT.md avant tout travail.

## Commandes
- `pnpm dev` : lancer l'app en local
- `pnpm build` : construire l'app
- `pnpm start` : lancer l'app construite
- `pnpm lint` : vérifier le code avec ESLint
- `pnpm test` : lancer les tests (Vitest)

## Stack
- Next.js 16 (App Router, dossier `src/app/`), React 19, TypeScript, Tailwind CSS 4.
- Gestionnaire de paquets : pnpm.

## Architecture
3 couches, chacune n'appelle que la suivante :
- Présentation : `src/app/` (pages) et `src/presentation/` (actions, composants, providers). Passe toujours par un service.
- Service : `src/services/`. Règles métier et validation. Reçoit la couche données en paramètre.
- Données : `src/data/`. Seule couche qui parle à la base.
Chaque test est à côté du fichier testé (`*.test.ts`).

## Design system
- Thème C · Outil, défini dans `src/app/globals.css` : `:root` pour le clair, `.dark` pour le sombre. Toute couleur est une variable du thème, jamais une valeur en dur.
- Chaque écran fonctionne en clair ET en sombre.
- Composants shadcn dans `src/presentation/components/ui/` (`pnpm dlx shadcn@latest add <composant>`).
- Polices : IBM Plex Sans (texte), IBM Plex Mono (code, dates).

## Git
- On travaille sur dev. Jamais de commit direct sur main.
- Un seul commit par lot : feat(lot-N): <titre du lot>.
- Les PR vont de dev vers main.

## Secrets
- Les valeurs vont dans .env.local, ignoré par Git (.gitignore exclut .env*).
- Ne lis jamais .env ni .env.local.
