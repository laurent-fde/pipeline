# Intention · Pipeline

## Produit
Un mini CRM de prospection pour une seule personne.
Je note mes contacts, je les fais avancer d'étape en étape, dans une philosophie kanban, je sais qui relancer aujourd'hui.

## Architecture
Une architecture en 3 couches : présentation, service, données.
Seule la couche données parle à la base.
Une base légère, stockée localement, migrable vers une base managée.
Passer à une base managée ne modifie que la couche données, sans devoir changer le reste.
Les règles métier ont des tests unitaires.

## Contraintes
Next.js, composants shadcn, déploiement sur Vercel.
SQLite en local, Turso visé pour la prod.
Un seul utilisateur.
Aucun secret dans le code, les clés sont dans des variables d'environnement.

## Hors périmètre
Pas d'authentification, pas de gestion de droits, pas de multi-utilisateur.

## Critères d'acceptation
- J'ajoute un contact, il apparaît dans la liste.
- Après redémarrage de l'app, mes contacts sont toujours là.
- Je fais passer un contact à l'étape suivante, il change de colonne.
- Un contact dont la date de relance est aujourd'hui apparaît dans « À relancer ».
