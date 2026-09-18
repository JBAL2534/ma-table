// Numéro de version de Ma Table : un seul endroit à changer. Le cache hors-ligne et l'écran Profil le reprennent.
// Les nouveautés de chaque version sont affichées à la première ouverture qui suit la mise à jour.
(function (racine) {
  racine.MaTable = racine.MaTable || {};
  racine.MaTable.VERSION = '1.3.2';
  racine.MaTable.NOUVEAUTES = {
    '1.3.2': ['Scanner : « Relancer la caméra » demande la caméra dans le geste même, comme iOS l’exige ; si iOS la garde fermée, le message explique quoi faire.'],
    '1.3.1': ['Scanner : « Relancer la caméra » recharge la page, seule façon fiable de rouvrir la caméra après une coupure par iOS.'],
    '1.3.0': [
      'Scanner : si Open Food Facts ne connaît pas le code, trois bases sœurs sont interrogées (hygiène et cosmétique, entretien et maison, animaux).',
      'Un code inconnu que vous nommez est mémorisé : reconnu au prochain scan, sur tous vos appareils.',
    ],
    '1.2.2': ['Scanner : « Relancer la caméra » repart d’un écran neuf et fonctionne aussi quand iOS redemande l’autorisation.'],
    '1.2.1': ['Scanner : si la caméra est coupée (bouton « Arrêter » d’iOS, autre application), un bouton « Relancer la caméra » apparaît.'],
    '1.2.0': [
      'Un bandeau « Mise à jour prête » apparaît quand une nouvelle version est arrivée, avec un bouton pour l’appliquer.',
      'Cette fenêtre « Nouveautés » s’ouvre une fois après chaque mise à jour.',
      'Profil : « Rechercher une mise à jour » vérifie à la demande.',
    ],
    '1.1.1': ['Menus : les boutons « Proposer à nouveau » et « Tableau de bord » ne débordent plus de la carte sur iPhone.'],
    '1.1.0': [
      'Synchronisation entre vos appareils (Profil → ☁️), avec un jeton GitHub.',
      'Scanner : la caméra lit les codes-barres sur iPhone ; un code n’est retenu qu’après deux lectures identiques.',
      'Prix mémorisés depuis les tickets photographiés, estimation par magasin, prix qui ont bougé.',
      'Magasins personnalisables : ajouter, renommer, choisir un pictogramme, ordonner, retirer.',
      'Nombre de convives par repas ; les quantités suivent.',
      '« Tout aux courses » annulable, sans doublon ; retrait en bloc depuis la liste (bouton ⋯).',
      'Après un scan, « À acheter » ou « Je l’ai déjà », chacun annulable.',
    ],
  };
})(typeof self !== 'undefined' ? self : globalThis);
