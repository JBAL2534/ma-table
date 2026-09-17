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
- **Scanner** : code-barres (caméra si l'appareil le permet, sinon saisie) via Open Food Facts,
  Nutri-Score, alternative douce pour un D ou un E. En option, avec votre propre clé API
  Anthropic : photo d'un produit, du frigo ou d'un ticket de caisse.
- **Historique** : semaines archivées, notation des repas (« On refait », « Bof », « Jamais
  plus ») et réaction de l'enfant, qui pilotent les propositions suivantes ; « Réutiliser cette
  semaine » ; recherche ; tableau de bord sans calories ; statistiques ; export CSV.
- **Profil** : membres et goûts, organisation (horaires, temps max, jour du batch, magasins,
  budget, repas plaisir), option Drive, suivi du poids privé protégé par code, export, import
  (fusion ou remplacement), aide à l'installation.

## Ce qu'elle ne fait pas (et pourquoi)

- Pas de synchronisation instantanée entre deux téléphones : il n'y a pas de serveur. On partage
  par le fichier d'export (AirDrop, Messages) puis **Fusionner** à l'import : les deux listes se
  combinent sans doublon, avec le nom de qui a coché quoi.
- Pas d'intelligence artificielle imposée : la proposition de semaine repose sur des règles
  claires et vos avis. La photo n'apparaît qu'avec une clé saisie dans Profil.
- Pas de calories, nulle part.

## Structure

| Dossier / fichier | Rôle |
| --- | --- |
| `index.html`, `css/style.css` | La page et la feuille de style (mobile d'abord, mode sombre) |
| `js/donnees/` | Recettes et articles de départ |
| `js/moteur/` | Toute la logique, sans interface : `stockage`, `courses`, `menus`, `historique`, `scan`, `ia` |
| `js/ecrans/` | Un fichier par onglet |
| `js/ui.js`, `js/app.js` | Aides d'affichage, navigation |
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

L'application est un dossier de fichiers statiques : n'importe quel hébergement suffit. Le plus
simple, déjà utilisé pour ADIA Courses : un dépôt GitHub public avec **Pages** activé sur `main`.
Sur iPhone, ouvrir l'adresse dans **Safari** (pas dans l'aperçu Google Drive, qui n'exécute pas
le JavaScript), puis Partager → « Sur l'écran d'accueil ».

Les données vivent dans le navigateur (localStorage). Vider les données de site de Safari les
efface : penser à exporter de temps en temps.
