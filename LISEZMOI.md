# Ma Table

Assistant familial : menus sains sans culpabilité, batch cooking du dimanche, une seule liste de
courses pour tous les magasins, et la mémoire de semaine en semaine. Application web pensée pour
iPhone (PWA installable, fonctionne hors ligne), 100 % en français, sans compte ni serveur.

## Ce que fait l'application

- **Menus** : « Proposer ma semaine » compose sept jours selon l'organisation de la famille
  (cantine et lunch boxes en semaine, dîners en 25 minutes ou réchauffés, batch cooking le
  dimanche, au moins deux dîners approuvés enfant, un repas plaisir le week-end, protéines variées).
  Un tap sur un repas : autre idée, choisir une recette, déplacer, ingrédients aux courses, noter.
  Fiche recette avec portions ajustables, astuce pour l'enfant, conservation. Écran « batch
  cooking » avec l'ordre de production (Cookeo et air fryer en parallèle), les boîtes et les
  étiquettes imprimables. 42 recettes de départ, recettes personnelles.
- **Courses** : liste vivante répartie par magasin (Supermarché, Biocoop, Grand Frais, Marché),
  rayons dans l'ordre d'un parcours réel, ajout rapide avec autocomplétion et dictée, essentiels
  réactivables d'un tap, suggestions tirées de l'historique, mode « En magasin » plein écran avec
  compteur et écran maintenu allumé, « Terminer ce magasin » qui archive et remplit le garde-manger.
  Option Drive : liste prête à coller et liens de recherche.
- **Scanner** : code-barres par la caméra (lecture native quand le navigateur la propose, sinon
  par la bibliothèque ZXing embarquée, licence MIT ; saisie des chiffres en secours) via Open Food Facts,
  Nutri-Score, alternative douce pour un D ou un E. En option, avec votre propre clé API
  Anthropic : photo d'un produit, du frigo ou d'un ticket de caisse.
- **Historique** : semaines archivées, notation des repas (« On refait », « Bof », « Jamais
  plus ») et réaction de l'enfant, qui pilotent les propositions suivantes ; « Réutiliser cette
  semaine » ; recherche ; tableau de bord sans calories ; statistiques ; export CSV.
- **Profil** : membres et goûts, organisation (horaires, temps max, jour du batch, magasins,
  budget, repas plaisir), option Drive, suivi du poids privé protégé par code, export, import
  (fusion ou remplacement), aide à l'installation.

## Ce qu'elle ne fait pas (et pourquoi)

- Pas de serveur à nous. La **synchronisation entre appareils** (Profil → ☁️) passe par un
  fichier privé sur le compte GitHub de la famille (un « gist ») : chaque appareil le relit toutes
  les trente secondes quand l'application est ouverte, fusionne, puis réécrit. Il faut un jeton
  GitHub limité au droit « gist », collé une fois sur chaque appareil ; le mode d'emploi est dans
  l'application. Sans jeton, le partage passe par le fichier d'export puis **Fusionner** à l'import.
- Rien n'est jamais supprimé : un article retiré ou acheté est archivé avec sa date. C'est ce qui
  permet à la fusion de ne rien faire revenir et de ne rien perdre (la version la plus récente gagne,
  un coché récent l'emporte sur un décoché ancien).
- Pas d'intelligence artificielle imposée : la proposition de semaine repose sur des règles
  claires et vos avis. La photo n'apparaît qu'avec une clé saisie dans Profil.
- Pas de calories, nulle part.

## Structure

| Dossier / fichier | Rôle |
| --- | --- |
| `index.html`, `css/style.css` | La page et la feuille de style (mobile d'abord, mode sombre) |
| `js/donnees/` | Recettes et articles de départ |
| `js/moteur/` | Toute la logique, sans interface : `stockage` (dont la fusion), `courses`, `menus`, `historique`, `scan`, `ia`, `synchro` |
| `js/ecrans/` | Un fichier par onglet |
| `js/ui.js`, `js/app.js` | Aides d'affichage, navigation |
| `js/lib/zxing.min.js` | Seule dépendance embarquée : lecture des codes-barres (ZXing, MIT) |
| `sw.js`, `manifest.webmanifest`, `icones/` | Installation et hors-ligne |
| `test/run-tests.js` | Tests du moteur |
| `test/ecrans.js` | Chaque écran monté dans jsdom, chaque bouton cliqué, parcours du premier jour |

Le moteur ne touche jamais au DOM : il tourne à l'identique dans le navigateur et dans Node.
Aucune donnée personnelle dans le code (un test le vérifie) : prénoms et goûts se saisissent dans
l'application.

## Tester et essayer

```bash
npm install --no-save --no-package-lock jsdom@30   # une fois, pour les tests d'écran
npm test
python3 -m http.server 8792                          # puis http://localhost:8792/
```

## Publier

**En ligne** : https://jbal2534.github.io/ma-table/ (dépôt `JBAL2534/ma-table`, Pages sur `main`).
Chaque push sur `main` met le site à jour en une ou deux minutes.

L'application est un dossier de fichiers statiques : n'importe quel hébergement suffit. Le plus
simple, déjà utilisé pour ADIA Courses : un dépôt GitHub public avec **Pages** activé sur `main`.
Sur iPhone, ouvrir l'adresse dans **Safari** (pas dans l'aperçu Google Drive, qui n'exécute pas
le JavaScript), puis Partager → « Sur l'écran d'accueil ».

Les données vivent dans le navigateur (localStorage). Vider les données de site de Safari les
efface : penser à exporter de temps en temps.
