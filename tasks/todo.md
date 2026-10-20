# Tâches : À l'affût

Contexte et décisions : `tasks/plan.md`. Tout texte visible sur le site est **en anglais**.
Commandes : `npm test` (tests, sans réseau) ; `python -m http.server 8000` puis http://localhost:8000
(les modules ES exigent un serveur HTTP).

---

## Phase 1 : chemin complet avec une source

### T1 : Coquille de la page au design de référence
**Description :** Reprendre la structure et le CSS de `reference/interface.html` en anglais : en-tête
collant flouté (logo ✦, « À l'affût », recherche avec loupe SVG et `/`, bouton principal « Add company »),
colonne de filtres, zone des résultats avec état vide. Mettre en place `package.json` et `node --test`.
Écrire `safe.js` (`esc`, `safeUrl`) avec ses tests.

**Critères d'acceptation :**
- [x] La page vide s'affiche comme la référence, en clair et en sombre (selon le système), sans texte français.
- [x] `safeUrl()` n'accepte que `https:` (refuse `javascript:`, `http:`, `data:`, URL invalides) ; `esc()` neutralise `<>&"'`.
- [x] `npm test` passe.

**Vérification :** `npm test` ; contrôle visuel côte à côte avec la référence, dans les deux thèmes.
**Dépendances :** aucune
**Fichiers :** `index.html`, `css/style.css`, `js/app.js`, `js/core/safe.js`, `tests/safe.test.js`, `package.json`
**Taille :** M

### T2 : Ajouter une entreprise Greenhouse de bout en bout
**Description :** Le visiteur colle un lien Greenhouse (`boards.`, `job-boards.`, `job-boards.eu.`), le site
reconnaît le compte, interroge l'API, annonce « N jobs found », propose un nom affiché modifiable, puis
enregistre. Les offres apparaissent en cartes (pastille colorée par nom, titre, entreprise, lieu, date de
publication, lien vers l'offre d'origine) et sont toujours là après rechargement.

**Critères d'acceptation :**
- [x] `detect()` reconnaît les trois formes d'URL Greenhouse (lien d'offre ou page carrière) et renvoie un refus lisible sinon.
- [x] L'adaptateur Greenhouse, testé sur une réponse réelle enregistrée, ne garde que titre, lieu, date et lien `https:`.
- [x] Ajout → rechargement : entreprise et offres conservées ; une source qui ne répond pas affiche une erreur au lieu d'enregistrer.

**Vérification :** `npm test` ; manuel avec un vrai compte Greenhouse ; test d'injection (titre `<img src=x onerror=alert(1)>`, lien `javascript:`) sans effet.
**Dépendances :** T1
**Fichiers :** `js/core/detect.js`, `js/core/sources/greenhouse.js`, `js/core/fetch.js`, `js/core/store.js`, `js/ui/add.js`, tests + `tests/fixtures/greenhouse.json`
**Taille :** M (limite haute)

### T3 : Relevé à l'ouverture et suivi des changements
**Description :** À l'ouverture, interroger les sources dont le dernier relevé réussi date de plus de 15 min
(bouton « Refresh » pour forcer, minimum 2 min par source), avec barre de progression. Fusionner les
résultats : offres nouvelles, disparues (seulement après une réponse **réussie**), sources en erreur.
Afficher les chiffres clés (Open jobs, New, Applications sent, Sources with errors) et le bandeau
« Needs attention » avec la cause de chaque erreur.

**Critères d'acceptation :**
- [ ] `tracker.js` testé : une offre absente d'une réponse réussie passe « Disappeared on DD.MM.YYYY » ; une source en erreur ne fait disparaître aucune offre ; une offre réapparue redevient ouverte.
- [ ] « New » = repérée depuis la dernière visite (frontière d'une heure) ; le premier relevé d'une entreprise ajoutée n'est pas « New ».
- [ ] Une source en échec n'empêche pas les autres de s'afficher.

**Vérification :** `npm test` ; manuel : couper le réseau pour une source (URL de compte inexistant) et vérifier le bandeau.
**Dépendances :** T2
**Fichiers :** `js/core/tracker.js`, `js/core/store.js`, `js/app.js`, `js/ui/summary.js`, `tests/tracker.test.js`
**Taille :** M

### Checkpoint 1
- [ ] `npm test` passe
- [ ] Parcours complet : ajouter une entreprise Greenhouse, recharger, voir New / Disappeared
- [ ] Rendu conforme à la référence
- [ ] **Revue avec toi avant de continuer**

---

## Phase 2 : autres sources (T4 à T7 indépendantes entre elles)

Pour chaque source : enregistrer d'abord une vraie réponse en fixture, puis `detect` + adaptateur + tests.
L'interface ne change pas.

### T4 : Lever
**Critères d'acceptation :**
- [ ] `jobs.lever.co/{compte}` → `api.lever.co`, `jobs.eu.lever.co/{compte}` → `api.eu.lever.co`.
- [ ] Lieux multiples (`allLocations`) conservés ; date `createdAt` (ms) convertie.
- [ ] Testé sur fixture réelle ; l'API UE essayée une fois avec un vrai compte (résultat noté dans `plan.md`).

**Vérification :** `npm test` ; ajout manuel d'un compte Lever.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/lever.js`, test + fixture · **Taille :** S

### T5 : Ashby
**Critères d'acceptation :**
- [ ] `jobs.ashbyhq.com/{compte}` reconnu.
- [ ] Une offre `isListed: false` n'est **jamais** retournée (test dédié).
- [ ] Lieux secondaires conservés.

**Vérification :** `npm test` ; ajout manuel d'un compte Ashby.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/ashby.js`, test + fixture · **Taille :** S

### T6 : SmartRecruiters
**Critères d'acceptation :**
- [ ] `jobs.smartrecruiters.com/{compte}` et `careers.smartrecruiters.com/{compte}` reconnus.
- [ ] Pagination suivie jusqu'au total, plafonnée à 10 pages de 100 (au-delà : avertissement dans « Needs attention »).
- [ ] Lien vers l'offre reconstruit en `https:`.

**Vérification :** `npm test` (fixtures de deux pages) ; ajout manuel d'un compte.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/smartrecruiters.js`, test + fixtures · **Taille :** S

### T7 : RSS / Atom et outils non pris en charge
**Critères d'acceptation :**
- [ ] Flux RSS 2.0 et Atom lus (titre, lien, date ; lieu absent → « Not specified ») ; testé avec le flux du CERN enregistré.
- [ ] Un flux bloqué par le navigateur (CORS) donne un message clair, pas une erreur brute.
- [ ] Workday, Amazon et toute page HTML : message expliquant que l'outil n'est pas pris en charge et pourquoi.

**Vérification :** `npm test` (avec `linkedom` en dépendance de dev) ; ajout manuel de `https://careers.cern/jobs/feed/`.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/rss.js`, test + fixtures, `package.json` · **Taille :** S

### Checkpoint 2
- [ ] `npm test` passe
- [ ] Une entreprise réelle par outil ajoutée et relevée sans erreur
- [ ] Revue rapide avec toi

---

## Phase 3 : consulter et marquer

### T8 : Recherche
**Critères d'acceptation :**
- [ ] Sur titre, entreprise et lieu ; sans accents ni majuscules ; tous les mots doivent correspondre.
- [ ] Termes surlignés (ambre) sans casser l'échappement (texte échappé avant surlignage, cas `Zürich`/`zurich` couvert).
- [ ] `/` place le curseur dans la recherche, `Esc` l'efface.

**Vérification :** `npm test` (`search.test.js`) ; manuel au clavier.
**Dépendances :** T3 · **Fichiers :** `js/core/search.js`, `js/app.js`, `tests/search.test.js` · **Taille :** S

### T9 : Statuts et marques
**Critères d'acceptation :**
- [ ] Statuts Open, New, Applied, Disappeared, All, Not interested, avec compteurs ; une offre « Not interested » n'apparaît que dans ce dernier.
- [ ] « I applied » → « ✓ Applied on DD.MM.YYYY » (survol vert) ; « Not interested » → « Show again » dans son statut (survol rouge) ; un second clic annule.
- [ ] Marques conservées après rechargement ; statut choisi mémorisé.

**Vérification :** `npm test` (filtres de statut) ; manuel.
**Dépendances :** T3 · **Fichiers :** `js/core/store.js`, `js/core/filters.js`, `js/ui/cards.js`, `js/app.js`, test · **Taille :** M

### T10 : Villes, filtres ville / entreprise, tri
**Critères d'acceptation :**
- [ ] `cities.js` ramène les variantes à des noms anglais canoniques (Geneva, Zurich, Basel, Bern, Zug, Lucerne… plus les grandes villes d'Europe et d'ailleurs) ; « Paris · Zurich · Warsaw » → trois villes ; rien reconnu → « Not specified ».
- [ ] Filtres ville et entreprise à cocher avec compteurs, « Show all » pour réinitialiser.
- [ ] Tri : Recently spotted, Publication date, Company (A → Z), Title (A → Z).

**Vérification :** `npm test` avec les exemples du brief (« Zurich, Zurich, CHE », « Zuerich », « Zürich, CH »…) ; manuel.
**Dépendances :** T8, T9 · **Fichiers :** `js/core/cities.js`, `js/core/filters.js`, `js/ui/filters.js`, `tests/cities.test.js` · **Taille :** M

### Checkpoint 3
- [ ] `npm test` passe
- [ ] Recherche + statut + ville + entreprise + tri se combinent correctement
- [ ] Revue avec toi

---

## Phase 4 : gérer sa liste et cadre légal

### T11 : Entreprises suivies
**Critères d'acceptation :**
- [ ] Liste des entreprises suivies (pastille, nom, outil, nombre d'offres, état du dernier relevé), dans le style existant.
- [ ] Renommer met à jour cartes, filtres et recherche ; retirer (avec confirmation) supprime l'entreprise et ses offres.

**Vérification :** manuel ; `npm test` pour les fonctions de `store.js`.
**Dépendances :** T3 · **Fichiers :** `js/ui/companies.js`, `js/core/store.js`, `index.html`, test · **Taille :** S

### T12 : Sauvegarde et restauration
**Critères d'acceptation :**
- [ ] « Export » télécharge un fichier JSON daté et versionné (entreprises, offres, marques).
- [ ] « Import » valide le fichier (version, types, liens `https:`) et remplace l'état après confirmation ; un fichier invalide est refusé avec un message clair sans rien toucher.
- [ ] Aller-retour export → navigateur vidé → import : état identique.

**Vérification :** `npm test` (validation, fichiers malformés ou hostiles) ; manuel dans une fenêtre privée.
**Dépendances :** T9 · **Fichiers :** `js/core/store.js`, `js/ui/backup.js`, `tests/store.test.js` · **Taille :** S

### T13 : Suggestions et liste de blocage
**Critères d'acceptation :**
- [ ] Liste vide → écran d'accueil avec le champ « paste a link » et des suggestions ajoutables en un clic (`data/suggestions.json`, une dizaine d'entreprises vérifiées à faire valider).
- [ ] Une source présente dans `data/blocklist.json` est refusée à l'ajout avec un message, n'est plus interrogée, et ses offres disparaissent chez les visiteurs qui la suivaient.

**Vérification :** `npm test` (blocage dans `detect` et au relevé) ; manuel en ajoutant un compte à la blocklist.
**Dépendances :** T7, T11 · **Fichiers :** `data/suggestions.json`, `data/blocklist.json`, `js/ui/welcome.js`, `js/core/detect.js`, test · **Taille :** M

### T14 : Pied de page et pages légales
**Critères d'acceptation :**
- [ ] Pied de page : Legal notice, Data & privacy, « Independent site, not affiliated with the companies listed », Support the project.
- [ ] `legal.html` : éditeur, contact, procédure de demande de retrait ; `privacy.html` : aucune donnée côté serveur, stockage local, requêtes faites par le navigateur vers les API citées, pas de pistage.
- [ ] Même style que la page principale.

**Vérification :** manuel ; liens valides.
**Dépendances :** T1 (identité éditeur et plateforme de soutien à fournir) · **Fichiers :** `index.html`, `legal.html`, `privacy.html`, `css/style.css` · **Taille :** S

### Checkpoint 4
- [ ] `npm test` passe
- [ ] Parcours d'un nouveau visiteur : accueil → suggestion → offres → marque → export → import ailleurs
- [ ] Revue avec toi

---

## Phase 5 : finition et mise en ligne

### T15 : Mobile, accessibilité, CSP
**Critères d'acceptation :**
- [ ] Sous 860 px : une colonne, filtres derrière « Filters », pas de défilement horizontal.
- [ ] Tout faisable au clavier, focus visible, contrastes AA vérifiés dans les deux thèmes (y compris pastilles et badges).
- [ ] `.htaccess` : CSP (`default-src 'self'; connect-src https:; script-src 'self'; style-src 'self'`…), aucun script ni style inline restant ; quota `localStorage` dépassé → message clair.

**Vérification :** outils de dev du navigateur (mode mobile, Lighthouse accessibilité), parcours au clavier, console sans violation CSP.
**Dépendances :** T1–T14 · **Fichiers :** `css/style.css`, `index.html`, `.htaccess`, `js/core/store.js` · **Taille :** M

### T16 : Mise en ligne sur Infomaniak
**Critères d'acceptation :**
- [ ] Conditions générales des quatre éditeurs lues par toi (prérequis).
- [ ] Fichiers déployés sur alaffut.ch en HTTPS (sans `tests/`, `node_modules/`, `tasks/`), CSP active.
- [ ] Parcours complet vérifié en production, pour chaque outil.

**Vérification :** manuel en production, en-têtes vérifiés (`curl -I`).
**Dépendances :** T15 · **Fichiers :** aucun nouveau (éventuellement un script de déploiement) · **Taille :** S

### Checkpoint final
- [ ] Toutes les exigences de `reference/BRIEF.md` couvertes
- [ ] `npm test` passe
- [ ] Prêt pour le public
