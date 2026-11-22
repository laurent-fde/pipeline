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

- [x] Étant donné le formulaire, quand je saisis un nom et que je valide, alors le contact apparaît dans la liste avec ses informations.
  → `contact.service.test.ts` « enregistre un contact valide et le renvoie dans la liste avec ses informations » ; `contact.action.test.ts` « passe la saisie au service et rafraîchit la page quand l'ajout réussit » ; `new-contact-dialog.test.tsx` « ferme la fenêtre après un ajout réussi » ; `contact-card.test.tsx` « montre le nom et l'entreprise… » (coordonnées dans la fiche depuis le lot 9).
- [x] Étant donné un nom vide, quand je valide, alors « Le nom est obligatoire » s'affiche et rien n'est enregistré.
  → `contact.service.test.ts` « refuse un nom vide (%j) sans rien enregistrer » ; `contact-form.test.tsx` « affiche « Le nom est obligatoire » relié au champ Nom » ; `contact.action.test.ts` « renvoie les erreurs et la saisie sans rafraîchir quand le service refuse ».
- [x] Étant donné un e-mail mal formé, quand je valide, alors « L'e-mail n'est pas valide » s'affiche et rien n'est enregistré.
  → `contact.service.test.ts` « refuse l'e-mail mal formé %j sans rien enregistrer » ; `contact-form.test.tsx` « affiche « L'e-mail n'est pas valide » relié au champ E-mail, et garde la saisie ».
- [x] Étant donné des contacts enregistrés, quand je redémarre l'app, alors ils sont toujours dans la liste.
  → `contact.repository.test.ts` « retrouve les contacts après un redémarrage (nouvelle connexion au même fichier) ».

## Lot 2 · Voir les contacts par étape, en kanban

Les contacts sont rangés en colonnes, une par étape. Un nouveau contact arrive dans la première colonne.

- [x] Étant donné l'app ouverte, quand j'affiche le tableau, alors je vois les colonnes Nouveau, Contacté, RDV, Proposition, Gagné et Perdu, dans cet ordre.
  → `contact.service.test.ts` « renvoie les six étapes dans l'ordre, même sans contact » ; `kanban-board.test.tsx` « affiche les six colonnes dans l'ordre ».
- [x] Étant donné un contact que je viens d'ajouter, quand j'affiche le tableau, alors il est dans la colonne Nouveau.
  → `contact.service.test.ts` « enregistre un nouveau contact à l'étape « nouveau » et le range dans Nouveau » ; `kanban-board.test.tsx` « place chaque contact dans la colonne de son étape » ; `contact.repository.test.ts` « range dans « nouveau » les contacts d'une base créée avant les étapes ».
- [x] Étant donné des contacts, quand j'affiche le tableau, alors chaque colonne indique son nombre de contacts.
  → `contact.service.test.ts` « compte les contacts de chaque colonne » ; `kanban-board.test.tsx` « indique le nombre de contacts de chaque colonne, zéro compris ».
- [x] Étant donné aucun contact, quand j'ouvre l'app, alors un message invite à ajouter le premier contact.
  → `contact.service.test.ts` « indique un total de zéro quand il n'y a aucun contact » ; `kanban-board.test.tsx` « invite à ajouter le premier contact quand il n'y en a aucun, colonnes comprises ».

## Lot 3 · Faire avancer un contact d'étape

Sur la carte d'un contact, je le fais passer à l'étape suivante, je le ramène à la précédente en cas d'erreur, ou je le marque perdu.

- [x] Étant donné un contact dans une colonne, quand je clique « Étape suivante », alors il passe dans la colonne suivante.
  → `contact.service.test.ts` « fait passer un contact de %s à %s » ; `stage-controls.test.tsx` « « Étape suivante » demande le déplacement next » ; `kanban-board.test.tsx` « demande l'étape suivante au service depuis la carte » ; `contact.action.test.ts` « passe le déplacement au service et rafraîchit la page… ».
- [x] Étant donné un contact qui n'est ni dans Nouveau, ni dans Gagné ou Perdu, quand je clique « Étape précédente », alors il revient dans la colonne précédente. (Gagné et Perdu en sortent par « Rouvrir vers… », lot 7.)
  → `contact.service.test.ts` « ramène un contact de %s à %s » et « refuse « Étape précédente » depuis %s… » ; `stage-controls.test.tsx` « « Étape précédente » demande le déplacement previous ».
- [x] Étant donné un contact à n'importe quelle étape, quand je clique « Marquer perdu », alors il passe dans la colonne Perdu.
  → `contact.service.test.ts` « marque perdu un contact à l'étape %s » ; `stage-controls.test.tsx` « « Marquer perdu » demande le déplacement lost ».
- [x] Étant donné un contact dans Gagné ou Perdu, quand j'affiche sa carte, alors « Étape suivante » est indisponible.
  → `contact.service.test.ts` « refuse « Étape suivante » depuis %s, sans rien enregistrer » ; `stage-controls.test.tsx` « rend indisponibles les déplacements interdits » ; `kanban-board.test.tsx` « met un bouton « étape suivante » sur la carte seulement quand le déplacement est permis ».
- [x] Étant donné un contact déplacé, quand je redémarre l'app, alors il est toujours dans sa nouvelle colonne.
  → `contact.repository.test.ts` « garde la nouvelle étape après un redémarrage ».

## Lot 4 · Fixer une relance et voir « À relancer aujourd'hui »

Je fixe une date de relance sur un contact. Une section « À relancer » liste les contacts à relancer aujourd'hui ou en retard.

- [x] Étant donné un contact, quand je fixe sa relance à aujourd'hui, alors il apparaît dans « À relancer ».
  → `contact.service.test.ts` « fixe une relance à aujourd'hui et range le contact dans « À relancer » » ; `follow-up-form.test.tsx` « envoie la date choisie avec l'identifiant du contact » ; `follow-up-list.test.tsx` « liste les contacts à relancer ».
- [x] Étant donné une relance à une date passée, quand j'ouvre l'app, alors le contact apparaît dans « À relancer » avec l'indication « en retard ».
  → `contact.service.test.ts` « indique en retard une relance à une date passée » ; `follow-up-list.test.tsx` « indique « en retard » sur une relance passée ».
- [x] Étant donné une relance à une date future, quand j'ouvre l'app, alors le contact n'apparaît pas dans « À relancer ».
  → `contact.service.test.ts` « n'affiche pas une relance à une date future ».
- [x] Étant donné aucune relance due, quand j'ouvre l'app, alors « À relancer » affiche « Personne à relancer aujourd'hui ».
  → `contact.service.test.ts` « renvoie une liste vide quand aucune relance n'est due » ; `follow-up-list.test.tsx` « affiche « Personne à relancer aujourd'hui » quand la liste est vide ».

## Lot 5 · Marquer une relance comme faite

Quand j'ai relancé quelqu'un, je le marque comme fait. Il passe « En attente de réponse » jusqu'à ce que je fixe la prochaine relance, sans changer de colonne.

- [x] Étant donné un contact dans « À relancer », quand je clique « Relance faite », alors il sort de « À relancer ».
  → `contact.service.test.ts` « sort de « À relancer » un contact dont la relance est faite » ; `follow-up-list.test.tsx` « propose « Relance faite » pour chaque contact et envoie son identifiant » ; `contact.action.test.ts` « passe le contact au service et rafraîchit la page ».
- [x] Étant donné une relance marquée faite, quand j'affiche la carte du contact, alors elle porte le badge « En attente de réponse » et le contact reste dans sa colonne.
  → `contact.service.test.ts` « laisse le contact dans sa colonne, en attente de réponse » ; `contact-card.test.tsx` « affiche « En attente de réponse » quand la relance est faite, et seulement alors ».
- [x] Étant donné un contact « En attente de réponse », quand je fixe une nouvelle date de relance, alors le badge disparaît et la nouvelle date remplace l'ancienne.
  → `contact.service.test.ts` « retire l'attente et remplace la date quand je fixe une nouvelle relance ».
- [x] Étant donné un contact « En attente de réponse », quand je redémarre l'app, alors il porte toujours le badge.
  → `contact.repository.test.ts` « garde l'attente de réponse après un redémarrage ».

## Lot 6 · Modifier ou supprimer un contact

Je corrige les informations d'un contact, ou je le supprime après confirmation.

- [x] Étant donné un contact, quand je modifie son entreprise et que je valide, alors la carte affiche la nouvelle valeur.
  → `contact.service.test.ts` « enregistre la nouvelle entreprise, sans toucher à l'étape ni à la relance » ; `contact-actions.test.tsx` « ouvre le formulaire pré-rempli et envoie la modification… » ; `contact.repository.test.ts` « modifie les informations d'un contact… ».
- [x] Étant donné une modification avec un nom vide, quand je valide, alors « Le nom est obligatoire » s'affiche et rien ne change.
  → `contact.service.test.ts` « refuse un nom vide sans rien enregistrer » ; `contact-actions.test.tsx` « garde le formulaire ouvert et affiche l'erreur quand le nom est vide ».
- [x] Étant donné un contact, quand je clique « Supprimer » puis confirme, alors il disparaît du tableau et de « À relancer ».
  → `contact.service.test.ts` « supprime le contact du tableau et de « À relancer » » ; `contact-actions.test.tsx` « supprime le contact après confirmation » ; `contact.repository.test.ts` « supprime un contact ».
- [x] Étant donné la demande de confirmation, quand j'annule, alors le contact reste.
  → `contact-actions.test.tsx` « ne supprime rien si j'annule la confirmation ».

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

## Lot 8 · Glisser-déposer un contact sur le kanban

Je fais glisser la carte d'un contact sur une autre colonne pour changer son étape, sans passer par les boutons. Seuls les déplacements déjà permis sont acceptés : colonne suivante, précédente, Perdu, et depuis Gagné ou Perdu, une étape en cours. Livré avec la PR #26, corrigé par #27 et #28.

- [x] Étant donné un contact, quand je glisse sa carte sur une colonne permise, alors il passe dans cette colonne.
  → `contact.service.test.ts` « dépose un contact de %s sur %s » ; `contact.action.test.ts` « passe la colonne d'arrivée au service… » ; `kanban-board.test.tsx` « demande le déplacement quand la carte est déposée sur une autre colonne ».
- [x] Étant donné une carte en cours de glissement, quand je regarde le tableau, alors les colonnes où je peux la déposer sont mises en évidence, en clair comme en sombre.
  → `contact.service.test.ts` « donne à chaque colonne les colonnes où déposer ses cartes » ; `kanban-board.test.tsx` « met en évidence les colonnes où déposer la carte pendant le glissement » (attribut et classe de mise en évidence) ; captures clair et sombre dans la PR.
- [x] Étant donné une colonne non permise (par exemple Nouveau → RDV), quand j'y dépose la carte, alors « Ce déplacement n'est pas possible » s'affiche et le contact reste dans sa colonne.
  → `contact.service.test.ts` « refuse de déposer un contact de %s sur %s, sans rien enregistrer » ; `kanban-board.test.tsx` « annonce le refus d'un dépôt sur une colonne non permise ».
- [x] Étant donné un contact déplacé par glisser-déposer, quand je redémarre l'app, alors il est toujours dans sa nouvelle colonne.
  → `contact.repository.test.ts` « garde la nouvelle étape après un redémarrage » : le dépôt enregistre l'étape par le même `updateStage` que les boutons.
- [x] Étant donné le clavier ou un écran tactile, quand je veux changer d'étape, alors les boutons d'étape restent disponibles.
  → `kanban-board.test.tsx` « garde les boutons d'étape… » (sur la carte, puis dans la fiche contact à partir du lot 9).

## Lot 9 · Refonte de l'interface

L'écran devient plus lisible : une barre du haut, des indicateurs, des cartes compactes et une fiche contact qui regroupe les actions. D'après la maquette validée. Aucune règle métier ne change : les critères des lots 1 à 8 restent vrais.

- [x] Étant donné l'app ouverte, quand je regarde le haut de la page, alors je vois le titre, le bouton de thème et un bouton « Nouveau contact » ; le formulaire d'ajout n'est plus affiché en permanence.
  → `new-contact-dialog.test.tsx` « n'affiche le formulaire qu'après un clic sur « Nouveau contact » » ; barre du haut vérifiée dans le navigateur.
- [x] Étant donné le bouton « Nouveau contact », quand je clique dessus, alors une fenêtre s'ouvre avec le formulaire ; un ajout réussi la ferme et le contact arrive dans Nouveau ; une saisie refusée garde la fenêtre ouverte avec le message (critères du lot 1).
  → `new-contact-dialog.test.tsx` « ferme la fenêtre après un ajout réussi », « garde la fenêtre ouverte avec le message quand la saisie est refusée ».
- [x] Étant donné des contacts, quand j'affiche l'app, alors quatre indicateurs montrent : les contacts en cours sur le total, les relances dues aujourd'hui dont celles en retard, les contacts en attente de réponse, et le taux de gain (gagnés sur gagnés + perdus, « — » s'il n'y en a aucun).
  → `contact.service.test.ts` « compte les contacts en cours… », « n'a pas de taux de gain… », « arrondit le taux de gain… » ; `stats-bar.test.tsx`.
- [x] Étant donné une carte, quand je la regarde, alors elle montre seulement le nom, l'entreprise, un badge de relance (« en retard », « aujourd'hui » ou la date à venir), le badge « En attente de réponse » s'il y a lieu, un bouton « étape suivante » et une poignée de glissement.
  → `contact.service.test.ts` « donne à chaque carte l'état de sa relance… » ; `contact-card.test.tsx` ; `kanban-board.test.tsx` « met un bouton « étape suivante » sur la carte… ».
- [x] Étant donné une carte, quand je clique sur le nom du contact, alors sa fiche s'ouvre sur le côté avec l'étape, les boutons d'étape et « Rouvrir vers… », les coordonnées, la relance, « Modifier » et « Supprimer » (critères des lots 3 à 7).
  → `kanban-board.test.tsx` « propose « Rouvrir vers… » dans la fiche… », « n'active pas « Étape précédente » dans la fiche… », « garde les boutons d'étape… dans leur fiche », « garde la fiche ouverte quand le contact change de colonne » ; `contact-sheet.test.tsx` (étape, coordonnées, relance, modifier).
- [x] Étant donné le tableau, quand je le regarde, alors chaque étape a sa couleur, Gagné et Perdu sont plus discrètes, et une colonne vide affiche « Aucun contact · Glisse une carte ici ».
  → `kanban-board.test.tsx` « donne sa couleur à chaque étape… » (six couleurs du thème, toutes différentes), « annonce une colonne vide ».
- [x] Étant donné une carte, quand je la glisse, alors seule la poignée lance le glissement (le texte et les champs restent utilisables), et la mise en évidence d'une colonne s'éteint quand j'en sors (#29).
  → `kanban-board.test.tsx` « ne rend déplaçable que la poignée… », « éteint la mise en évidence au survol… ».
- [x] Étant donné le thème clair ou sombre, quand j'utilise l'écran, alors tout est lisible et rien n'est coupé, sur grand écran comme sur téléphone.
  → vérifié dans le navigateur en clair et en sombre (tableau, fiche, fenêtre d'ajout) sur grand écran (1440 px) et à largeur de téléphone (390 px) : pas de défilement horizontal de la page, seul le tableau défile.

## Lot 10 · Rechercher et filtrer les contacts

Au-dessus du tableau, je cherche un contact par son nom, son entreprise ou son e-mail, et je filtre le tableau pour ne voir que les contacts à relancer ou en attente de réponse. D'après la maquette du lot 9. Le service décide quels contacts correspondent ; la recherche et le filtre sont gardés dans l'adresse de la page.

- [x] Étant donné des contacts, quand je tape « lumen » dans « Rechercher un contact », alors le tableau ne montre que les contacts dont le nom, l'entreprise ou l'e-mail contient « lumen », sans tenir compte des majuscules ni des accents (« eleonore » trouve « Éléonore »).
  → `contact.service.test.ts` « trouve « lumen » dans le nom, l'entreprise ou l'e-mail… », « trouve « eleonore » dans « Éléonore »… » ; `board-toolbar.test.tsx` « met la recherche dans l'adresse de la page ».
- [x] Étant donné les filtres « Tous », « À relancer » et « En attente de réponse », quand je choisis « À relancer », alors seuls les contacts dont la relance est en retard ou aujourd'hui restent ; « En attente de réponse » garde ceux dont la relance est faite ; « Tous » enlève le filtre.
  → `contact.service.test.ts` « « À relancer » garde… », « « En attente de réponse » garde… », « « Tous » (ou aucun filtre)… » ; `board-toolbar.test.tsx` « marque le filtre actif… », « « Tous » retire le filtre… », « garde le filtre cliqué pendant que la saisie attend d'être appliquée ».
- [x] Étant donné une recherche et un filtre, quand les deux sont actifs, alors seuls les contacts qui répondent aux deux restent, et le nombre affiché sur chaque colonne compte les contacts visibles.
  → `contact.service.test.ts` « combine recherche et filtre, et compte les contacts visibles de chaque colonne ».
- [x] Étant donné une recherche qui ne trouve rien, quand je regarde le tableau, alors « Aucun contact ne correspond » s'affiche avec un bouton « Effacer la recherche » qui remet le tableau complet.
  → `contact.service.test.ts` « remet le tableau complet avec une vue vide » ; `kanban-board.test.tsx` « annonce qu'aucun contact ne correspond… » ; `board-toolbar.test.tsx` « « Effacer la recherche » vide le champ, retire le filtre et annule la saisie en attente ». Le bouton retire aussi le filtre, pour revenir au tableau complet.
- [x] Étant donné une recherche ou un filtre actif, quand je recharge la page ou partage son adresse, alors la même recherche et le même filtre sont appliqués.
  → `contact.service.test.ts` « renvoie la vue appliquée, et ignore un filtre inconnu… », « accepte les paramètres d'adresse répétés… » ; `board-toolbar.test.tsx` « reprend la recherche et le filtre de l'adresse », « recale le champ sur l'adresse quand elle change ailleurs » ; vérifié dans le navigateur (rechargement de `?q=zzz&filtre=en-attente`).
- [x] Étant donné un tableau filtré, quand je glisse une carte ou ouvre une fiche, alors tout fonctionne comme sur le tableau complet (lots 8 et 9).
  → `kanban-board.test.tsx` « garde le glisser-déposer et la fiche sur un tableau filtré », « garde la fiche ouverte quand le contact ne correspond plus au filtre, et le signale ».
- [x] Étant donné le thème clair ou sombre, quand j'utilise la recherche et les filtres, alors tout est lisible et rien n'est coupé, sur grand écran comme sur téléphone.
  → vérifié dans le navigateur en clair et en sombre sur grand écran (1440 px) ; vérifié par Laurent sur téléphone après la mise en ligne (PR #38), rien de coupé.
