// L'état complet de l'application, en un seul objet, enregistré à chaque changement.
// Dans le navigateur : localStorage. Dans les tests : en mémoire. Rien n'est jamais effacé :
// toute importation pose d'abord une copie de sûreté.
(function (racine) {
  const MaTable = racine.MaTable = racine.MaTable || {};
  const CLE = 'ma-table';
  const CLE_SAUVEGARDE = 'ma-table.copie-de-surete';
  const VERSION = 1;

  function etatDefaut() {
    return {
      version: VERSION,
      creeLe: new Date().toISOString(),
      famille: {
        nom: 'Ma famille',
        membres: [
          { id: 'm1', nom: 'Papa', role: 'adulte', age: null, aime: [], aimePeu: [], objectifs: ['Maintenir le poids'] },
          { id: 'm2', nom: 'Maman', role: 'adulte', age: null, aime: [], aimePeu: [], objectifs: ['Maintenir le poids'] },
          { id: 'm3', nom: 'Notre fille', role: 'enfant', age: 8, aime: [], aimePeu: [], objectifs: ['Plus de légumes'] },
        ],
      },
      reglages: {
        heureRetour: '18:45',
        tempsMaxSemaine: 25,
        jourBatch: 7,                 // 1 = lundi … 7 = dimanche
        magasins: ['supermarche', 'biocoop', 'grand_frais', 'marche'],
        budget: null,
        tolerancePlaisir: 1,          // repas plaisir par week-end
        drive: { actif: false, modeleUrl: '' },
        cuisinierSoir: 'm1',
        cuisinierWeekend: 'm2',
        voixActive: true,
        ia: { cle: '' },
      },
      recettes: [],                   // recettes ajoutées ou modifiées par la famille (les recettes de départ viennent des données)
      recettesMasquees: [],           // identifiants de recettes de départ que la famille ne veut plus voir
      semaines: {},                   // lundi ISO → semaine
      avis: [],                       // { id, date, creneau, recetteId, titre, note, enfant, quand }
      liste: [],                      // articles de la liste vivante
      listeArchivee: [],              // articles retirés ou achetés (jamais supprimés : la fusion en a besoin)
      preferencesMagasin: {},         // nom normalisé → { magasin, rayon }
      essentiels: null,               // null = prendre ceux des données de départ
      achats: [],                     // { id, date, magasin, articles, montant, par }
      gardeManger: [],
      produits: {},                   // code-barres → produit (Open Food Facts)
      poids: {},                      // membreId → { code, mesures: [{ date, kg }] }
      utilisateur: null,              // membreId de la personne qui utilise ce téléphone
      synchro: { actif: false, jeton: '', gistId: null, dernierEnvoi: null, derniereReception: null, etag: null, erreur: null },
    };
  }

  // Ajoute les champs manquants à un état ancien, sans jamais en retirer.
  function completer(etat) {
    const d = etatDefaut();
    for (const cle of Object.keys(d)) {
      if (etat[cle] === undefined) etat[cle] = d[cle];
    }
    for (const cle of Object.keys(d.reglages)) {
      if (etat.reglages[cle] === undefined) etat.reglages[cle] = d.reglages[cle];
    }
    if (!etat.famille.membres) etat.famille.membres = d.famille.membres;
    etat.version = VERSION;
    return etat;
  }

  // Règle de fusion : par identifiant, la version la plus récemment modifiée gagne ; les collections
  // s'unissent ; rien n'est supprimé. Retourne le nombre de changements par famille.
  function plusRecent(a, b) { return ((a && (a.modifieLe || a.generee || a.quand || a.ajouteLe)) || '') >= ((b && (b.modifieLe || b.generee || b.quand || b.ajouteLe)) || ''); }
  function fusionnerEtat(moi, autre) {
    const U = MaTable.util;
    const bilan = { articles: 0, achats: 0, avis: 0, semaines: 0, gardeManger: 0, recettes: 0, autres: 0 };
    // Articles : actifs et archivés forment un seul ensemble, par identifiant.
    const tous = new Map();
    for (const a of (moi.liste || []).concat(moi.listeArchivee || [])) tous.set(a.id, a);
    for (const a of (autre.liste || []).concat(autre.listeArchivee || [])) {
      const mien = tous.get(a.id);
      if (!mien) { tous.set(a.id, a); bilan.articles++; continue; }
      if (JSON.stringify(mien) === JSON.stringify(a)) continue;
      let [recent, ancien] = plusRecent(mien, a) ? [mien, a] : [a, mien];
      // À la même seconde, un article coché l'emporte : c'est le geste qu'on ne veut pas perdre en magasin.
      if ((mien.modifieLe || '') === (a.modifieLe || '') && a.coche && !mien.coche) [recent, ancien] = [a, mien];
      const fusion = Object.assign({}, recent);
      // Un coché récent l'emporte sur un décoché plus ancien, et inversement.
      if (ancien.coche && !recent.coche && (ancien.cocheLe || '') > (recent.decocheLe || '')) { fusion.coche = true; fusion.cochePar = ancien.cochePar; fusion.cocheLe = ancien.cocheLe; }
      fusion.sources = Array.from(new Set((mien.sources || []).concat(a.sources || [])));
      tous.set(a.id, fusion); bilan.articles++;
    }
    moi.liste = []; moi.listeArchivee = [];
    for (const a of tous.values()) ((a.statut && a.statut !== 'actif') ? moi.listeArchivee : moi.liste).push(a);
    // Deux appareils ont pu ajouter le même article chacun de leur côté : on n'en garde qu'un.
    const parNom = new Map();
    for (const a of moi.liste.slice()) {
      const cle = U.racineMot(a.nom) + '|' + (a.unite || '');
      const deja = parNom.get(cle);
      if (!deja) { parNom.set(cle, a); continue; }
      const [garde, doublon] = plusRecent(deja, a) ? [deja, a] : [a, deja];
      if (doublon.coche && !garde.coche) { garde.coche = true; garde.cochePar = doublon.cochePar; garde.cocheLe = doublon.cocheLe; }
      garde.sources = Array.from(new Set((garde.sources || []).concat(doublon.sources || [])));
      doublon.statut = 'fusionne'; doublon.modifieLe = new Date().toISOString();
      moi.liste = moi.liste.filter(x => x !== doublon); moi.listeArchivee.push(doublon);
      parNom.set(cle, garde);
    }
    const unionParId = (cible, source, compteur) => { const ids = new Set(cible.map(x => x.id)); for (const x of source || []) if (!ids.has(x.id)) { cible.push(x); bilan[compteur]++; } };
    unionParId(moi.achats, autre.achats, 'achats');
    unionParId(moi.avis, autre.avis, 'avis');
    for (const r of autre.recettes || []) {
      const i = moi.recettes.findIndex(x => x.id === r.id);
      if (i === -1) { moi.recettes.push(r); bilan.recettes++; }
      else if (!plusRecent(moi.recettes[i], r) && JSON.stringify(moi.recettes[i]) !== JSON.stringify(r)) { moi.recettes[i] = r; bilan.recettes++; }
    }
    for (const [lundi, s] of Object.entries(autre.semaines || {})) {
      const mienne = moi.semaines[lundi];
      if (!mienne || (!plusRecent(mienne, s) && JSON.stringify(mienne) !== JSON.stringify(s))) { moi.semaines[lundi] = s; bilan.semaines++; }
    }
    for (const g of autre.gardeManger || []) {
      const i = moi.gardeManger.findIndex(x => x.id === g.id || U.racineMot(x.nom) === U.racineMot(g.nom));
      if (i === -1) { moi.gardeManger.push(g); bilan.gardeManger++; }
      else if (!plusRecent(moi.gardeManger[i], g) && JSON.stringify(moi.gardeManger[i]) !== JSON.stringify(g)) { moi.gardeManger[i] = g; bilan.gardeManger++; }
    }
    for (const [code, p] of Object.entries(autre.produits || {})) if (!moi.produits[code]) { moi.produits[code] = p; bilan.autres++; }
    for (const [k, v] of Object.entries(autre.preferencesMagasin || {})) if (!moi.preferencesMagasin[k]) { moi.preferencesMagasin[k] = v; bilan.autres++; }
    if (Array.isArray(autre.essentiels)) {
      const miens = MaTable.Courses.essentiels(moi).slice();
      const vus = new Set(miens.map(n => U.racineMot(n)));
      const ajouts = autre.essentiels.filter(n => !vus.has(U.racineMot(n)));
      if (ajouts.length) { moi.essentiels = miens.concat(ajouts); bilan.autres += ajouts.length; }
    }
    for (const m of autre.famille.membres || []) {
      const i = moi.famille.membres.findIndex(x => x.id === m.id);
      if (i === -1) { moi.famille.membres.push(m); bilan.autres++; }
      else if (!plusRecent(moi.famille.membres[i], m) && JSON.stringify(moi.famille.membres[i]) !== JSON.stringify(m)) { moi.famille.membres[i] = m; bilan.autres++; }
    }
    if (autre.famille.modifieLe && (autre.famille.modifieLe > (moi.famille.modifieLe || '')) && autre.famille.nom) { moi.famille.nom = autre.famille.nom; moi.famille.modifieLe = autre.famille.modifieLe; }
    if (autre.reglages && autre.reglages.modifieLe && autre.reglages.modifieLe > (moi.reglages.modifieLe || '')) {
      const ia = moi.reglages.ia;
      moi.reglages = Object.assign({}, moi.reglages, autre.reglages, { ia });
      bilan.autres++;
    }
    for (const [id, p] of Object.entries(autre.poids || {})) {
      if (!moi.poids[id]) { moi.poids[id] = p; continue; }
      const dates = new Set((moi.poids[id].mesures || []).map(x => x.date));
      const nouvelles = (p.mesures || []).filter(x => !dates.has(x.date));
      if (nouvelles.length) { moi.poids[id].mesures = (moi.poids[id].mesures || []).concat(nouvelles); bilan.autres++; }
    }
    for (const id of autre.recettesMasquees || []) if (!moi.recettesMasquees.includes(id)) { moi.recettesMasquees.push(id); bilan.autres++; }
    bilan.total = Object.values(bilan).reduce((t, n) => t + n, 0);
    return bilan;
  }

  const memoire = {};
  function support() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLE + '.test', '1');
        localStorage.removeItem(CLE + '.test');
        return localStorage;
      }
    } catch (e) { /* stockage indisponible : on garde en mémoire */ }
    return { getItem: k => (k in memoire ? memoire[k] : null), setItem: (k, v) => { memoire[k] = v; }, removeItem: k => { delete memoire[k]; } };
  }

  const Stockage = {
    etat: null,
    ecouteurs: [],
    charger() {
      const brut = support().getItem(CLE);
      let etat = null;
      if (brut) {
        try { etat = JSON.parse(brut); } catch (e) { etat = null; }
      }
      if (!etat) etat = etatDefaut();
      this.etat = completer(etat);
      return this.etat;
    },
    sauver() {
      if (!this.etat) return;
      this.etat.modifieLe = new Date().toISOString();
      support().setItem(CLE, JSON.stringify(this.etat));
      this.ecouteurs.forEach(f => { try { f(this.etat); } catch (e) { /* un écran en erreur n'empêche pas l'enregistrement */ } });
    },
    // Enregistre sans dater ni prévenir les écrans : pour les métadonnées de synchronisation.
    sauverSilencieux() { if (this.etat) support().setItem(CLE, JSON.stringify(this.etat)); },
    ecouter(f) { this.ecouteurs.push(f); },
    // L'export ne contient jamais la clé API : elle reste sur ce téléphone.
    exporter() {
      const copie = JSON.parse(JSON.stringify(this.etat));
      if (copie.reglages && copie.reglages.ia) copie.reglages.ia = { cle: '' };
      if (copie.synchro) copie.synchro = Object.assign({}, copie.synchro, { jeton: '', etag: null, erreur: null });
      return JSON.stringify({ application: 'Ma Table', version: VERSION, exporteLe: new Date().toISOString(), donnees: copie }, null, 1);
    },
    // Importe un fichier exporté. Une copie de sûreté de l'état actuel est posée avant tout remplacement.
    lire(texte) {
      let obj;
      try { obj = JSON.parse(texte); } catch (e) { throw new Error('Ce fichier n’est pas un export de Ma Table.'); }
      const donnees = obj && obj.application === 'Ma Table' ? obj.donnees : obj;
      if (!donnees || typeof donnees !== 'object' || !donnees.famille) throw new Error('Ce fichier n’est pas un export de Ma Table.');
      return donnees;
    },
    // Remplace tout par le contenu du fichier. Une copie de sûreté de l'état actuel est posée avant.
    importer(texte) {
      const donnees = this.lire(texte);
      const cleLocale = this.etat && this.etat.reglages && this.etat.reglages.ia ? this.etat.reglages.ia.cle : '';
      const synchroLocale = this.etat ? this.etat.synchro : null;
      support().setItem(CLE_SAUVEGARDE, JSON.stringify({ posseLe: new Date().toISOString(), donnees: this.etat }));
      this.etat = completer(donnees);
      if (cleLocale && !this.etat.reglages.ia.cle) this.etat.reglages.ia.cle = cleLocale;
      if (synchroLocale) this.etat.synchro = synchroLocale;
      this.sauver();
      return this.etat;
    },
    // Fusionne les données d'un autre téléphone avec celles-ci : rien n'est perdu de part et d'autre.
    fusionner(texte) {
      const autre = completer(this.lire(texte));
      support().setItem(CLE_SAUVEGARDE, JSON.stringify({ posseLe: new Date().toISOString(), donnees: this.etat }));
      const bilan = fusionnerEtat(this.etat, autre);
      this.sauver();
      return bilan;
    },
    // Version partagée entre appareils : sans clé API, sans jeton, sans « qui utilise ce téléphone ».
    pourSynchro() {
      const copie = JSON.parse(JSON.stringify(this.etat));
      if (copie.reglages && copie.reglages.ia) delete copie.reglages.ia;
      delete copie.synchro; delete copie.utilisateur;
      return JSON.stringify({ application: 'Ma Table', version: VERSION, exporteLe: new Date().toISOString(), donnees: copie });
    },
    copieDeSurete() {
      const brut = support().getItem(CLE_SAUVEGARDE);
      if (!brut) return null;
      try { return JSON.parse(brut); } catch (e) { return null; }
    },
    reinitialiserPourTests() { this.etat = etatDefaut(); this.ecouteurs = []; return this.etat; },
    etatDefaut, fusionnerEtat, completer,
  };

  MaTable.Stockage = Stockage;
})(typeof window !== 'undefined' ? window : globalThis);
