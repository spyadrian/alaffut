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
- [x] `tracker.js` testé : une offre absente d'une réponse réussie passe « Disappeared on DD.MM.YYYY » ; une source en erreur ne fait disparaître aucune offre ; une offre réapparue redevient ouverte.
- [x] « New » = repérée depuis la dernière visite (frontière d'une heure) ; le premier relevé d'une entreprise ajoutée n'est pas « New ».
- [x] Une source en échec n'empêche pas les autres de s'afficher.

**Vérification :** `npm test` ; manuel : couper le réseau pour une source (URL de compte inexistant) et vérifier le bandeau.
**Dépendances :** T2
**Fichiers :** `js/core/tracker.js`, `js/core/store.js`, `js/app.js`, `js/ui/summary.js`, `tests/tracker.test.js`
**Taille :** M

### Checkpoint 1
- [x] `npm test` passe
- [x] Parcours complet : ajouter une entreprise Greenhouse, recharger, voir New / Disappeared
- [x] Rendu conforme à la référence
- [x] **Revue avec toi avant de continuer**

---

## Phase 2 : autres sources (T4 à T7 indépendantes entre elles)

Pour chaque source : enregistrer d'abord une vraie réponse en fixture, puis `detect` + adaptateur + tests.
L'interface ne change pas.

### T4 : Lever
**Critères d'acceptation :**
- [x] `jobs.lever.co/{compte}` → `api.lever.co`, `jobs.eu.lever.co/{compte}` → `api.eu.lever.co`.
- [x] Lieux multiples (`allLocations`) conservés ; date `createdAt` (ms) convertie.
- [x] Testé sur fixture réelle ; l'API UE essayée une fois avec un vrai compte (résultat noté dans `plan.md`).

**Vérification :** `npm test` ; ajout manuel d'un compte Lever.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/lever.js`, test + fixture · **Taille :** S

### T5 : Ashby
**Critères d'acceptation :**
- [x] `jobs.ashbyhq.com/{compte}` reconnu.
- [x] Une offre `isListed: false` n'est **jamais** retournée (test dédié).
- [x] Lieux secondaires conservés.

**Vérification :** `npm test` ; ajout manuel d'un compte Ashby.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/ashby.js`, test + fixture · **Taille :** S

### T6 : SmartRecruiters
**Critères d'acceptation :**
- [x] `jobs.smartrecruiters.com/{compte}` et `careers.smartrecruiters.com/{compte}` reconnus.
- [x] Pagination suivie jusqu'au total, plafonnée à 10 pages de 100 (au-delà : avertissement dans « Needs attention »).
- [x] Lien vers l'offre reconstruit en `https:`.

**Vérification :** `npm test` (fixtures de deux pages) ; ajout manuel d'un compte.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/smartrecruiters.js`, test + fixtures · **Taille :** S

### T7 : RSS / Atom et outils non pris en charge
**Critères d'acceptation :**
- [x] Flux RSS 2.0 et Atom lus (titre, lien, date ; lieu absent → « Not specified ») ; testé avec le flux du CERN enregistré.
- [x] Un flux bloqué par le navigateur (CORS) donne un message clair, pas une erreur brute.
- [x] Workday, Amazon et toute page HTML : message expliquant que l'outil n'est pas pris en charge et pourquoi.

**Vérification :** `npm test` (avec `linkedom` en dépendance de dev) ; ajout manuel de `https://careers.cern/jobs/feed/`.
**Dépendances :** T2 · **Fichiers :** `js/core/detect.js`, `js/core/sources/rss.js`, test + fixtures, `package.json` · **Taille :** S

### Checkpoint 2
- [x] `npm test` passe
- [x] Une entreprise réelle par outil ajoutée et relevée sans erreur
- [x] Revue rapide avec toi

---

## Phase 3 : consulter et marquer

### T8 : Recherche
**Critères d'acceptation :**
- [x] Sur titre, entreprise et lieu ; sans accents ni majuscules ; tous les mots doivent correspondre.
- [x] Termes surlignés (ambre) sans casser l'échappement (texte échappé avant surlignage, cas `Zürich`/`zurich` couvert).
- [x] `/` place le curseur dans la recherche, `Esc` l'efface.

**Vérification :** `npm test` (`search.test.js`) ; manuel au clavier.
**Dépendances :** T3 · **Fichiers :** `js/core/search.js`, `js/app.js`, `tests/search.test.js` · **Taille :** S

### T9 : Statuts et marques
**Critères d'acceptation :**
- [x] Statuts Open, New, Applied, Disappeared, All, Not interested, avec compteurs ; une offre « Not interested » n'apparaît que dans ce dernier.
- [x] « I applied » → « ✓ Applied on DD.MM.YYYY » (survol vert) ; « Not interested » → « Show again » dans son statut (survol rouge) ; un second clic annule.
- [x] Marques conservées après rechargement ; statut choisi mémorisé.

**Vérification :** `npm test` (filtres de statut) ; manuel.
**Dépendances :** T3 · **Fichiers :** `js/core/store.js`, `js/core/filters.js`, `js/ui/cards.js`, `js/app.js`, test · **Taille :** M

### T10 : Villes, filtres ville / entreprise, tri
**Critères d'acceptation :**
- [x] `cities.js` : ville = ce qui précède la première virgule, chaque lieu joint par « · » ou « ; » compté à part ; regroupement sans casse ni accents (Zürich = Zurich = ZURICH), affiché avec l'orthographe la plus fréquente ; pas de table de variantes (Genève, Geneva et Genf restent séparées) ; lieu vide → « Not specified » ; « Paris · Zurich, CH · Warsaw » → trois villes.
- [x] Filtres ville et entreprise à cocher, par ordre alphabétique (« Not specified » en dernier), « Show all » pour réinitialiser ; chaque compteur tient compte du statut, de la recherche et de l'autre liste (pas de ses propres cases) ; un choix à 0 est grisé, pas retiré.
- [x] Tri : Recently spotted, Publication date, Company (A → Z), Title (A → Z).

**Vérification :** `npm test` (« Zurich, Zurich, CHE », « Zürich, CH », « Paris · Zurich · Warsaw »…) ; manuel.
**Dépendances :** T8, T9 · **Fichiers :** `js/core/cities.js`, `js/core/filters.js`, `js/ui/filters.js`, `tests/cities.test.js` · **Taille :** M

### Checkpoint 3
- [x] `npm test` passe
- [x] Recherche + statut + ville + entreprise + tri se combinent correctement
- [x] Revue avec toi

---

## Phase 4 : gérer sa liste et cadre légal

### T11 : Entreprises suivies
**Critères d'acceptation :**
- [x] Liste des entreprises suivies (pastille, nom, outil, nombre d'offres, état du dernier relevé), dans le style existant.
- [x] Renommer met à jour cartes, filtres et recherche ; retirer (avec confirmation) supprime l'entreprise et ses offres.

**Vérification :** manuel ; `npm test` pour les fonctions de `store.js`.
**Dépendances :** T3 · **Fichiers :** `js/ui/companies.js`, `js/core/store.js`, `index.html`, test · **Taille :** S

### T12 : Sauvegarde et restauration
**Critères d'acceptation :**
- [x] « Export » télécharge un fichier JSON daté et versionné (entreprises, offres, marques).
- [x] « Import » valide le fichier (version, types, liens `https:`) et remplace l'état après confirmation ; un fichier invalide est refusé avec un message clair sans rien toucher.
- [x] Aller-retour export → navigateur vidé → import : état identique.

**Vérification :** `npm test` (validation, fichiers malformés ou hostiles) ; manuel dans une fenêtre privée.
**Dépendances :** T9 · **Fichiers :** `js/core/store.js`, `js/ui/backup.js`, `tests/store.test.js` · **Taille :** S

### T13 : Suggestions et liste de blocage
**Critères d'acceptation :**
- [x] Liste vide → écran d'accueil avec le champ « paste a link » et des suggestions ajoutables en un clic (`data/suggestions.json`, une dizaine d'entreprises vérifiées à faire valider).
- [x] Une source présente dans `data/blocklist.json` est refusée à l'ajout avec un message, n'est plus interrogée, et ses offres disparaissent chez les visiteurs qui la suivaient.

**Vérification :** `npm test` (blocage dans `detect` et au relevé) ; manuel en ajoutant un compte à la blocklist.
**Dépendances :** T7, T11 · **Fichiers :** `data/suggestions.json`, `data/blocklist.json`, `js/ui/welcome.js`, `js/core/detect.js`, test · **Taille :** M

### T14 : Pied de page et pages légales
**Critères d'acceptation :**
- [x] Pied de page : Legal notice, Data & privacy, « Independent site, not affiliated with the companies listed ». Support the project : reporté, plateforme pas encore choisie (21.10.2026).
- [x] `legal.html` : éditeur, contact, procédure de demande de retrait ; `privacy.html` : aucune donnée côté serveur, stockage local, requêtes faites par le navigateur vers les API citées, pas de pistage.
- [x] Même style que la page principale.
- [ ] Remplacer `[PUBLISHER NAME]`, `[PUBLISHER LOCATION]`, `[CONTACT EMAIL]` dans `legal.html` et `privacy.html` (avant T16).

**Vérification :** manuel ; liens valides.
**Dépendances :** T1 (identité éditeur et plateforme de soutien à fournir) · **Fichiers :** `index.html`, `legal.html`, `privacy.html`, `css/style.css` · **Taille :** S

### Checkpoint 4
- [x] `npm test` passe
- [x] Parcours d'un nouveau visiteur : accueil → suggestion → offres → marque → export → import ailleurs (`tests/journey.test.js`)
- [x] Revue avec toi

---

## Phase 5 : finition et mise en ligne

### T15 : Mobile, accessibilité, CSP
**Critères d'acceptation :**
- [x] Sous 860 px : une colonne, filtres derrière « Filters », pas de défilement horizontal.
- [x] Focus visible, contrastes AA vérifiés dans les deux thèmes (y compris pastilles et badges).
- [x] Parcours complet au clavier, fait par toi dans un vrai navigateur.
- [x] `.htaccess` : CSP (`default-src 'self'; connect-src https:; script-src 'self'; style-src 'self'`…), aucun script ni style inline restant ; quota `localStorage` dépassé → message clair.

**Vérification :** outils de dev du navigateur (mode mobile, Lighthouse accessibilité), parcours au clavier, console sans violation CSP.
**Dépendances :** T1–T14 · **Fichiers :** `css/style.css`, `index.html`, `.htaccess`, `js/core/store.js` · **Taille :** M

### T15a : Ajouter une entreprise par son nom
**Description :** Dans « Add company », le visiteur peut taper un nom au lieu d'un lien. Le site en tire
2 ou 3 comptes probables (« Back Market » → `backmarket`, `back-market` : minuscules, sans accents ni
apostrophes) et les essaie en parallèle sur Greenhouse, Lever (US et EU), Ashby, SmartRecruiters, et sur le
flux Teamtailor `https://{compte}.teamtailor.com/jobs.rss` (CORS ouvert, 404 si inconnu, vérifié le
21.10.2026). Les autres flux RSS ne sont pas devinés : le domaine est inconnu et la plupart bloquent le CORS.

**Critères d'acceptation :**
- [x] Une saisie qui n'est pas un lien est traitée comme un nom ; un lien garde le comportement actuel.
- [x] Résultats trouvés → liste au choix (outil, nombre d'offres, lien vers la page carrière pour vérifier) ; rien n'est ajouté sans que le visiteur choisisse (homonymes).
- [x] Seuls les comptes avec au moins une offre sont proposés (SmartRecruiters répond 200 et 0 offre pour une entreprise inconnue) ; la blocklist et les entreprises déjà suivies sont filtrées.
- [x] Rien trouvé → message clair : « We couldn't find it ourselves », avec quoi chercher soi-même (le lien d'une offre ou de la page carrière).
- [x] Une source qui échoue (délai, erreur) n'empêche pas d'afficher les autres résultats.

**Vérification :** `npm test` (génération des comptes, tri des réponses, sans réseau) ; manuel avec quelques vrais noms, une entreprise inconnue et une bloquée.
**Dépendances :** T13 · **Fichiers :** `js/core/detect.js` ou nouveau `js/core/lookup.js`, `js/ui/add.js`, `index.html`, `css/style.css`, test · **Taille :** M

### T15b : Afficher les offres par tranches
**Description :** Aujourd'hui toutes les offres filtrées sont rendues d'un coup, et à chaque action (marque,
filtre, frappe dans la recherche). Une grosse entreprise Greenhouse peut en avoir plusieurs milliers : page
lente et pied de page inatteignable. On affiche les 50 premières et un bouton « Show 50 more » en bas,
plutôt qu'une pagination numérotée (moins de code, pas de retour en haut à chaque page).

**Critères d'acceptation :**
- [x] Au plus 50 cartes affichées ; « Show 50 more (N left) » ajoute les suivantes ; le bouton disparaît quand tout est affiché.
- [ ] Changer de filtre, de tri, de statut ou de recherche revient aux 50 premières ; marquer une offre garde le nombre affiché.
- [x] Le compteur « N results » reste le total filtré, pas le nombre affiché.
- [x] Le bouton est atteignable au clavier et le focus passe à la première nouvelle carte après un clic.
- [x] Le pied de page est atteignable avec 2000 offres suivies, sans ralentissement visible.

**Vérification :** `npm test` (découpage) ; manuel avec une fixture de 2000 offres importée par la sauvegarde.
**Dépendances :** T15 · **Fichiers :** `js/ui/cards.js`, `js/app.js`, `index.html`, `css/style.css`, test · **Taille :** S

### T16 : Mise en ligne sur Infomaniak
**Critères d'acceptation :**
- [ ] Conditions générales des quatre éditeurs lues par toi (prérequis).
- [ ] Fichiers déployés sur alaffut.ch en HTTPS (sans `tests/`, `node_modules/`, `tasks/`), CSP active.
- [ ] Parcours complet vérifié en production, pour chaque outil.

**Vérification :** manuel en production, en-têtes vérifiés (`curl -I`).
**Dépendances :** T15, T15a, T15b · **Fichiers :** aucun nouveau (éventuellement un script de déploiement) · **Taille :** S

### Checkpoint final
- [ ] Toutes les exigences de `reference/BRIEF.md` couvertes
- [ ] `npm test` passe
- [ ] Prêt pour le public
