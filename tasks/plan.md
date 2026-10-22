# Plan d'implémentation : À l'affût (alaffut.ch)

## Vue d'ensemble

Site public, gratuit et sans compte qui suit les offres d'emploi des entreprises choisies par le visiteur.
Toutes les requêtes vers les API (Greenhouse, Lever, Ashby, SmartRecruiters, RSS/Atom) partent du
navigateur ; rien n'est stocké côté serveur. L'état (entreprises suivies, offres vues, marques) vit dans le
navigateur et s'exporte / s'importe en fichier JSON. Rendu repris de `reference/interface.html`.
**Tout le site est en anglais** (textes, boutons, statuts). Les villes s'affichent telles que les sources les écrivent.

Sources : `reference/BRIEF.md` (exigences), `reference/interface.html` (design).

## Décisions d'architecture

Validées avec toi :
- **JS natif sans build** : HTML + CSS + modules ES servis tels quels. Aucune dépendance à l'exécution.
  Tests avec `node --test` (`npm test`).
- **Accueil** : suggestions d'entreprises vérifiées, ajoutables en un clic (`data/suggestions.json`), en plus
  du champ « coller un lien ».
- **Retrait** : adresse e-mail de contact + `data/blocklist.json` (outil + compte). Une source bloquée ne peut
  plus être ajoutée, n'est plus interrogée, et ses offres sont retirées chez les visiteurs qui la suivaient.

Prises par défaut (à contester si besoin) :
- **Séparation logique / interface** : tout ce qui est non trivial vit dans `js/core/` en fonctions pures,
  sans DOM ni réseau, donc testable dans Node. `js/app.js` et `js/ui/` ne font que câbler et afficher.
- **Lecture d'une source** : chaque adaptateur expose `url(compte)` et `parse(réponse) → [{id, title,
  location, published, url}]`. Le `fetch` est fait par un seul module commun (timeout, 4 requêtes en
  parallèle maximum). On ne garde que titre, lieu, date et lien.
- **RSS/Atom** : analysé avec `DOMParser` dans le navigateur. Node n'en a pas : le parseur reçoit le
  `DOMParser` en paramètre et les tests utilisent `linkedom` en **dépendance de développement uniquement**
  (rien n'est livré au visiteur). Seule exception au « zéro dépendance ».
  Pages : `?paged=N` (WordPress, ex. CERN) suivi tant qu'une page apporte du nouveau, 10 pages au plus ;
  `rel="next"` (RFC 5005) non géré, aucun flux d'offres réel trouvé qui l'utilise (20.10.2026). Lieu : balise
  `location` (tout préfixe, ex. `tt:location` de Teamtailor), sinon `city`, sinon `region` + `country`,
  sinon « Not specified » (pas de champ de secours, décidé le 20.10.2026).
  Chaque requête de flux porte `_=<heure du relevé>` : careers.cern servait des copies en cache vieilles de
  2 à 4 semaines, différentes par page (constaté le 20.10.2026). Essayé sans effet sur Teamtailor, We Work
  Remotely, Himalayas, python.org, Remotive.
- **Stockage** : `localStorage`, une seule clé versionnée (`alaffut:v1`). Ordre de grandeur : 5 000 offres
  ≈ 1 Mo, sous la limite de ~5 Mo. Les offres disparues depuis plus de 90 jours sont purgées, sauf si
  marquées « Applied ». Une erreur de quota est affichée clairement avec un appel à exporter.
- **« New » = nouveau depuis la dernière visite** : au chargement, si la visite précédente date de plus
  d'une heure, une nouvelle visite commence et sa frontière est mémorisée. Une offre est « New » si elle a
  été repérée après cette frontière. Les offres trouvées au premier relevé d'une entreprise qu'on vient
  d'ajouter ne sont **pas** « New » (sinon tout serait nouveau).
- **Ménager les sites** : relevé automatique à l'ouverture seulement si le dernier relevé réussi d'une
  source date de plus de 15 min ; bouton « Refresh » pour forcer, avec un minimum de 2 min par source.
  SmartRecruiters : pagination plafonnée (10 pages de 100).
- **Sécurité** : le texte venant des API est inséré via `textContent` ou échappé ; tout lien passe par
  `safeUrl()` qui n'accepte que `https:`. CSP stricte via `.htaccess` (Infomaniak = Apache) :
  `script-src 'self'`, `connect-src https:` (les flux RSS ont des domaines arbitraires).
- **Villes** (décidé avec toi le 20.10.2026) : pas de table de variantes, trop arbitraire (certaines villes
  fusionnées, d'autres non). Une ville = ce qui précède la première virgule de chaque lieu (les lieux multiples
  sont joints par « · » ou « ; »), regroupée sans casse ni accents et affichée avec son orthographe la plus fréquente.
  Genève / Geneva / Genf restent donc séparées. Plus tard : rapprocher les lieux d'un référentiel comme GeoNames.
- **Thème** : clair/sombre selon le système uniquement (pas de bouton), palette du brief.

## Structure prévue

```
index.html            page unique
legal.html            legal notice + removal request
privacy.html          Data & privacy
css/style.css         repris de la référence
js/app.js             câblage : état, événements, rendu
js/ui/*.js            rendu des cartes, filtres, modale d'ajout…
js/core/safe.js       esc(), safeUrl()
js/core/detect.js     URL collée → {tool, account} ou raison du refus
js/core/sources/*.js  un adaptateur par outil
js/core/fetch.js      fetch commun (timeout, parallélisme)
js/core/tracker.js    fusion d'un relevé : new / disappeared / sources en erreur
js/core/cities.js     lieu → villes (première partie de chaque lieu)
js/core/search.js     normalisation, correspondance, surlignage
js/core/store.js      schéma, chargement, sauvegarde, export / import, purge
data/suggestions.json data/blocklist.json
tests/*.test.js       tests/fixtures/  (réponses réelles enregistrées, pas de réseau)
package.json          "test": "node --test"
.htaccess             CSP, en-têtes de cache
```

## Graphe de dépendances

```
safe.js ─┬─ rendu des cartes (UI)
         └─ adaptateurs (liens https)
detect.js ── modale d'ajout ── store.js ── tracker.js ── chiffres clés, bandeau « Needs attention »
adaptateurs + fetch.js ──┘                     │
                                               ├── search.js ── recherche
                                               ├── statuts + marques
                                               └── cities.js ── filtres ville / entreprise / tri
store.js ── export / import, liste des entreprises suivies
blocklist.json ── detect + relevé ;  suggestions.json ── écran d'accueil
```

## Liste des tâches

Détail (critères, vérifications, fichiers) dans `tasks/todo.md`.

### Phase 1 : chemin complet avec une source
- [x] T1 : Coquille de la page au design de référence (en anglais), outillage de test, `safe.js`
- [x] T2 : Ajouter une entreprise Greenhouse de bout en bout (coller → vérifier → nommer → offres affichées → conservées)
- [x] T3 : Relevé à l'ouverture + suivi des changements (New, Disappeared, sources en erreur, chiffres clés)

### Checkpoint 1 — revue humaine

### Phase 2 : autres sources (parallélisables)
- [x] T4 : Lever (y compris UE)
- [x] T5 : Ashby (jamais `isListed: false`)
- [x] T6 : SmartRecruiters (paginé)
- [x] T7 : RSS / Atom + message clair pour les outils non pris en charge

### Checkpoint 2

### Phase 3 : consulter et marquer
- [x] T8 : Recherche plein texte avec surlignage, `/` et `Esc`
- [x] T9 : Statuts et marques (Applied / Not interested)
- [x] T10 : Villes, filtres ville et entreprise, tri

### Checkpoint 3

### Phase 4 : gérer sa liste et cadre légal
- [x] T11 : Liste des entreprises suivies (renommer, retirer)
- [x] T12 : Sauvegarde et restauration (fichier JSON)
- [x] T13 : Suggestions à l'accueil + liste de blocage
- [x] T14 : Pied de page, Legal notice, Data & privacy, Support

### Checkpoint 4

### Phase 5 : finition et mise en ligne
- [x] T15 : Mobile, accessibilité, CSP
- [x] T15a : Ajouter une entreprise par son nom
- [x] T15b : Afficher les offres par tranches (« Show 50 more »)
- [ ] T15c : Règles sur les titres (exclure, prioriser, obliger)
- [ ] T16 : Mise en ligne sur Infomaniak

### Checkpoint final

## Risques et parades

| Risque | Impact | Parade |
|---|---|---|
| Lever change sa politique CORS (doc : non supporté) | Élevé | Source isolée ; une erreur passe dans « Needs attention » sans casser les autres. Surveiller. |
| Format réel des API différent de la doc (dates, lieux multiples) | Moyen | Fixtures enregistrées depuis de vraies réponses avant d'écrire chaque adaptateur. |
| `api.eu.lever.co` | Résolu | Testé le 20.10.2026 avec `ovoko`, `kwalee`, `everseen` : 200, CORS `*`, même format que l'API US. Ces comptes renvoient 404 sur `api.lever.co` → région gardée dans l'outil (`lever-eu`). |
| Données tierces qui injectent du code | Élevé | `textContent`/échappement partout, `safeUrl()`, CSP, test avec titre `<img onerror>` et lien `javascript:`. |
| Quota `localStorage` dépassé | Moyen | Purge à 90 jours, message clair + invitation à exporter. |
| Lieux trop hétérogènes : une même ville en plusieurs langues ou orthographes | Moyenne | Accepté pour l'instant (casse et accents seuls regroupés) ; plus tard, référentiel type GeoNames. |
| Conditions générales des éditeurs non lues | Élevé (juridique) | Bloquant avant T16 : lecture humaine, voir questions ouvertes. |

## Questions ouvertes (non bloquantes pour commencer)

- Identité de l'éditeur et adresse de contact : placeholders `[PUBLISHER NAME]`, `[PUBLISHER LOCATION]`,
  `[CONTACT EMAIL]` dans `legal.html` et `privacy.html`, à remplacer avant T16.
- Plateforme du lien « Support the project » : Ko-fi, Liberapay ou TWINT. Lien absent du pied de page tant que pas choisi.
- Liste de suggestions (T13), vérifiée le 21.10.2026, à valider : Proton, GetYourGuide, On, Scandit
  (Greenhouse), ANYbotics, Sonar (Lever), DeepJudge (Ashby), Swissquote, Sportradar, Nexthink
  (SmartRecruiters). CERN écarté : son flux redirige désormais vers une page de connexion.
  `data/blocklist.json` = liste de clés `"outil:compte"` (ex. `"lever:acme"`, `"rss:https://…"`).
- Lecture des conditions générales globales de Greenhouse, Lever, Ashby et SmartRecruiters : à faire
  par toi avant la mise en ligne (T16).
