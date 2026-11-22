# Lots · Pipeline

Découpage de Pipeline en lots, à partir d'`INTENT.md`. Un lot = une chose que l'utilisateur fait de bout en bout, de l'écran à la base. Chaque lot se livre en PR de `dev` vers `main`.

## Repères
- **Utilisateur** : une seule personne, qui prospecte.
- **Contact** : nom (obligatoire), entreprise, e-mail, téléphone.
- **Étapes** : Nouveau → Contacté → RDV → Proposition → Gagné. « Perdu » est atteint depuis n'importe quelle étape. Un contact Gagné ou Perdu peut être rouvert vers une étape en cours (lot 7).
- **En attente de réponse** : ce n'est pas une étape, c'est l'état d'un contact relancé dont on attend la réponse (lot 5).
- **Hors périmètre** : pas de connexion, pas de gestion de droits, pas de multi-utilisateur.

---

## Lot 1 · Ajouter un contact et le voir dans la liste

Je remplis un formulaire (nom, entreprise, e-mail, téléphone) et je valide. Le contact apparaît dans la liste, et il y est toujours après un redémarrage de l'app.

- [ ] Étant donné le formulaire, quand je saisis un nom et que je valide, alors le contact apparaît dans la liste avec ses informations.
- [ ] Étant donné un nom vide, quand je valide, alors « Le nom est obligatoire » s'affiche et rien n'est enregistré.
- [ ] Étant donné un e-mail mal formé, quand je valide, alors « L'e-mail n'est pas valide » s'affiche et rien n'est enregistré.
- [ ] Étant donné des contacts enregistrés, quand je redémarre l'app, alors ils sont toujours dans la liste.

## Lot 2 · Voir les contacts par étape, en kanban

Les contacts sont rangés en colonnes, une par étape. Un nouveau contact arrive dans la première colonne.

- [ ] Étant donné l'app ouverte, quand j'affiche le tableau, alors je vois les colonnes Nouveau, Contacté, RDV, Proposition, Gagné et Perdu, dans cet ordre.
- [ ] Étant donné un contact que je viens d'ajouter, quand j'affiche le tableau, alors il est dans la colonne Nouveau.
- [ ] Étant donné des contacts, quand j'affiche le tableau, alors chaque colonne indique son nombre de contacts.
- [ ] Étant donné aucun contact, quand j'ouvre l'app, alors un message invite à ajouter le premier contact.

## Lot 3 · Faire avancer un contact d'étape

Sur la carte d'un contact, je le fais passer à l'étape suivante, je le ramène à la précédente en cas d'erreur, ou je le marque perdu.

- [ ] Étant donné un contact dans une colonne, quand je clique « Étape suivante », alors il passe dans la colonne suivante.
- [ ] Étant donné un contact qui n'est ni dans Nouveau, ni dans Gagné ou Perdu, quand je clique « Étape précédente », alors il revient dans la colonne précédente. (Gagné et Perdu en sortent par « Rouvrir vers… », lot 7.)
- [ ] Étant donné un contact à n'importe quelle étape, quand je clique « Marquer perdu », alors il passe dans la colonne Perdu.
- [ ] Étant donné un contact dans Gagné ou Perdu, quand j'affiche sa carte, alors « Étape suivante » est indisponible.
- [ ] Étant donné un contact déplacé, quand je redémarre l'app, alors il est toujours dans sa nouvelle colonne.

## Lot 4 · Fixer une relance et voir « À relancer aujourd'hui »

Je fixe une date de relance sur un contact. Une section « À relancer » liste les contacts à relancer aujourd'hui ou en retard.

- [ ] Étant donné un contact, quand je fixe sa relance à aujourd'hui, alors il apparaît dans « À relancer ».
- [ ] Étant donné une relance à une date passée, quand j'ouvre l'app, alors le contact apparaît dans « À relancer » avec l'indication « en retard ».
- [ ] Étant donné une relance à une date future, quand j'ouvre l'app, alors le contact n'apparaît pas dans « À relancer ».
- [ ] Étant donné aucune relance due, quand j'ouvre l'app, alors « À relancer » affiche « Personne à relancer aujourd'hui ».

## Lot 5 · Marquer une relance comme faite

Quand j'ai relancé quelqu'un, je le marque comme fait. Il passe « En attente de réponse » jusqu'à ce que je fixe la prochaine relance, sans changer de colonne.

- [ ] Étant donné un contact dans « À relancer », quand je clique « Relance faite », alors il sort de « À relancer ».
- [ ] Étant donné une relance marquée faite, quand j'affiche la carte du contact, alors elle porte le badge « En attente de réponse » et le contact reste dans sa colonne.
- [ ] Étant donné un contact « En attente de réponse », quand je fixe une nouvelle date de relance, alors le badge disparaît et la nouvelle date remplace l'ancienne.
- [ ] Étant donné un contact « En attente de réponse », quand je redémarre l'app, alors il porte toujours le badge.

## Lot 6 · Modifier ou supprimer un contact

Je corrige les informations d'un contact, ou je le supprime après confirmation.

- [ ] Étant donné un contact, quand je modifie son entreprise et que je valide, alors la carte affiche la nouvelle valeur.
- [ ] Étant donné une modification avec un nom vide, quand je valide, alors « Le nom est obligatoire » s'affiche et rien ne change.
- [ ] Étant donné un contact, quand je clique « Supprimer » puis confirme, alors il disparaît du tableau et de « À relancer ».
- [ ] Étant donné la demande de confirmation, quand j'annule, alors le contact reste.

## Lot 7 · Rouvrir un contact Gagné ou Perdu

Un contact Gagné ou Perdu peut revenir dans le pipeline : je le rouvre vers l'étape en cours de mon choix. Livré avec la PR #13 ; lot créé ensuite pour rattacher la fonctionnalité (#14, #18).

- [x] Étant donné un contact Gagné ou Perdu, quand j'affiche sa carte, alors « Rouvrir vers… » est proposé ; sur un contact en cours, il ne l'est pas.
  → `contact.service.test.ts` « propose de rouvrir vers Nouveau, Contacté, RDV ou Proposition, seulement depuis Gagné ou Perdu » ; `kanban-board.test.tsx` « propose « Rouvrir vers… » sur une carte Perdu, pas sur une carte RDV ».
- [x] Étant donné « Rouvrir vers… » déplié, quand je choisis une étape parmi Nouveau, Contacté, RDV et Proposition, alors le contact passe dans cette colonne.
  → `contact.service.test.ts` « rouvre un contact de %s vers %s » ; `stage-controls.test.tsx` « rouvre un contact Gagné ou Perdu vers l'étape choisie ».
- [x] Étant donné un contact en cours, ou une étape d'arrivée Gagné, Perdu ou inconnue, quand je demande à le rouvrir, alors c'est refusé et rien n'est enregistré.
  → `contact.service.test.ts` « refuse de rouvrir un contact de %s vers %s, sans rien enregistrer » ; `stage-controls.test.tsx` « annonce l'erreur de « Rouvrir vers… » et garde la liste ouverte ».
- [x] Étant donné un contact rouvert, quand je redémarre l'app, alors il est toujours dans sa nouvelle colonne.
  → `contact.repository.test.ts` « garde la nouvelle étape après un redémarrage » (rouvrir enregistre l'étape par le même `updateStage`).
