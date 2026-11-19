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
- Next.js 16 (App Router, dossier `app/`), React 19, TypeScript, Tailwind CSS 4.
- Gestionnaire de paquets : pnpm.

## Git
- On travaille sur dev. Jamais de commit direct sur main.
- Un seul commit par lot : feat(lot-N): <titre du lot>.
- Les PR vont de dev vers main.

## Secrets
- Les valeurs vont dans .env.local, ignoré par Git (.gitignore exclut .env*).
- Ne lis jamais .env ni .env.local.
